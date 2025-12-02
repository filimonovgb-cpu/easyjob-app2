// src/contexts/PaymentContext.js

/**
 * Payment Context
 * Управление платежами и финансовыми операциями
 *
 * Дополнение:
 * - Добавлена защита при рендере children: если в children попадёт
 *   строка/число, оно автоматически будет обёрнуто в <Text>, чтобы
 *   избежать ошибки "Text strings must be rendered within a <Text> component".
 *
 * Примечание: это оборонительная правка — рекомендуется в будущем
 * найти и убрать источник "сырых" строк в children (в навигаторах/компонентах).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Text } from 'react-native';

// YooKassa / external payment service (JS SDK wrapper)
import yooPaymentService from '../services/paymentService'; // ранее paymentService

// Firebase wallet/transactions
import walletService from '../services/walletService';

// Firestore services (в т.ч. запись платежей)
import { dealService, paymentService as fsPaymentService } from '../services/firebaseService';

const PaymentContext = createContext();

const DEFAULT_POLL_INTERVAL_MS = 3000; // 3 секунды
const DEFAULT_POLL_ATTEMPTS = 10; // максимум опросов

export const PaymentProvider = ({ children }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [lastPayment, setLastPayment] = useState(null);

  // --- Polling helper (unchanged) ---
  const pollPaymentStatus = useCallback(
    async (externalId, firestorePaymentId, dealId) => {
      let attempts = 0;
      const check = async () => {
        attempts += 1;
        try {
          const res = await yooPaymentService.checkPaymentStatus(externalId);
          const status = res?.status || (res?.data && res.data.status) || null;

          if (status) {
            try {
              await fsPaymentService.updatePaymentStatus(firestorePaymentId, status);
            } catch (e) {
              console.warn('Failed to update payment status in Firestore:', e);
            }
          }

          if (status === 'succeeded' || status === 'captured' || status === 'paid') {
            try {
              if (dealId) {
                await dealService.unlockClientContacts(dealId);
                await dealService.updateDealStatus(dealId, 'confirmed');
              }
            } catch (e) {
              console.warn('Post-payment actions failed:', e);
            }
            return true;
          }

          if (status === 'canceled' || status === 'failed') {
            return true;
          }
        } catch (err) {
          console.warn('Error checking payment status:', err);
        }

        if (attempts >= DEFAULT_POLL_ATTEMPTS) {
          return true;
        }
        return false;
      };

      const loop = async () => {
        const done = await check();
        if (!done) {
          await new Promise((r) => setTimeout(r, DEFAULT_POLL_INTERVAL_MS));
          return loop();
        }
        return;
      };

      loop().catch((e) => console.warn('Polling loop failed:', e));
    },
    []
  );

  // --- Business methods (unchanged except defensive finally usage) ---
  const selectContractor = useCallback(
    async (userId, dealId, proposedPrice, contractorId) => {
      setIsProcessing(true);
      setPaymentError(null);

      try {
        const freezeResult = await walletService.freezeBalanceForDeal(userId, dealId, proposedPrice);

        if (!freezeResult.success) {
          setPaymentError(freezeResult.error);
          return { success: false, error: freezeResult.error };
        }

        await dealService.updateDeal(dealId, { status: 'accepted' });

        setLastPayment({
          type: 'selection',
          dealId,
          amount: proposedPrice,
          status: 'completed',
        });

        return { success: true, dealId, frozen: proposedPrice };
      } catch (error) {
        console.error('Error selecting contractor:', error);
        setPaymentError(error.message);
        return { success: false, error: error.message };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const confirmSelection = useCallback(async (userId, dealId, customerEmail) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const paymentResult = await yooPaymentService.confirmSelectionPayment(userId, dealId, customerEmail);

      if (!paymentResult || !paymentResult.success) {
        const errMsg = paymentResult?.error || 'Failed to create payment';
        setPaymentError(errMsg);
        return { success: false, error: errMsg };
      }

      const externalPaymentId = paymentResult.paymentId || paymentResult.id || null;
      const confirmationUrl = paymentResult.confirmationUrl || paymentResult.data?.confirmation?.confirmation_url;

      const createRes = await fsPaymentService.createPayment(dealId, userId, 'confirmation', 15);

      if (!createRes || !createRes.success) {
        console.warn('Failed to create Firestore payment record:', createRes);
      } else {
        const firestorePaymentId = createRes.paymentId;
        try {
          await fsPaymentService.updatePaymentStatus(firestorePaymentId, 'pending');
        } catch (e) {
          console.warn('Could not set firestore payment status to pending:', e);
        }

        if (externalPaymentId) {
          pollPaymentStatus(externalPaymentId, firestorePaymentId, dealId);
        }
      }

      setLastPayment({
        type: 'confirmation',
        dealId,
        amount: 15,
        paymentId: externalPaymentId,
        confirmationUrl,
      });

      return {
        success: true,
        confirmationUrl,
        paymentId: externalPaymentId,
      };
    } catch (error) {
      console.error('Error confirming selection:', error);
      setPaymentError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  }, [pollPaymentStatus]);

  const cancelDealEarly = useCallback(async (userId, dealId, proposedPrice) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const result = await walletService.cancelDealEarly(userId, dealId, proposedPrice);

      if (!result.success) {
        setPaymentError(result.error);
        return { success: false, error: result.error };
      }

      await dealService.updateDealStatus(dealId, 'cancelled_client');

      return result;
    } catch (error) {
      console.error('Error cancelling deal early:', error);
      setPaymentError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const cancelDealWithPenalty = useCallback(
    async (userId, contractorId, dealId, proposedPrice) => {
      setIsProcessing(true);
      setPaymentError(null);

      try {
        const result = await walletService.cancelDealWithPenalty(userId, contractorId, dealId, proposedPrice);

        if (!result.success) {
          setPaymentError(result.error);
          return { success: false, error: result.error };
        }

        await dealService.updateDealStatus(dealId, 'cancelled_client_late');

        return result;
      } catch (error) {
        console.error('Error cancelling deal with penalty:', error);
        setPaymentError(error.message);
        return { success: false, error: error.message };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const completeDeal = useCallback(async (dealId, contractorId, proposedPrice, dealCount) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const result = await walletService.completeDeal(dealId, contractorId, proposedPrice, dealCount);

      if (!result.success) {
        setPaymentError(result.error);
        return { success: false, error: result.error };
      }

      await dealService.updateDealStatus(dealId, 'completed');
      await dealService.unlockContractorContacts(dealId);

      return result;
    } catch (error) {
      console.error('Error completing deal:', error);
      setPaymentError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const addBalance = useCallback(async (userId, amount) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const result = await walletService.addBalance(userId, amount);

      if (!result.success) {
        setPaymentError(result.error);
        return { success: false, error: result.error };
      }

      return result;
    } catch (error) {
      console.error('Error adding balance:', error);
      setPaymentError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const withdrawBalance = useCallback(async (userId, amount) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const result = await walletService.withdrawBalance(userId, amount);

      if (!result.success) {
        setPaymentError(result.error);
        return { success: false, error: result.error };
      }

      return result;
    } catch (error) {
      console.error('Error withdrawing balance:', error);
      setPaymentError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const value = {
    isProcessing,
    paymentError,
    lastPayment,
    selectContractor,
    confirmSelection,
    cancelDealEarly,
    cancelDealWithPenalty,
    completeDeal,
    addBalance,
    withdrawBalance,
  };

  // --- DEFENSIVE RENDER: оборачиваем строки/числа в <Text> ---
  const renderSafeChildren = (c) => {
    // React.Children.toArray нормализует children, безопасно работает для single / array / null
    const arr = React.Children.toArray(c);
    if (arr.length === 0) return null;
    return arr.map((child, idx) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return <Text key={`pc_text_${idx}`}>{String(child)}</Text>;
      }
      return child;
    });
  };

  return (
    <PaymentContext.Provider value={value}>
      {renderSafeChildren(children)}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within PaymentProvider');
  }
  return context;
};

export default PaymentContext;
