// src/contexts/PaymentContext.js

/**
 * Payment Context
 * Управление платежами и финансовыми операциями
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import paymentService from '../services/paymentService';
import walletService from '../services/walletService';
import { dealService, paymentService as firebasePaymentService } from '../services/firebaseService';

const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [lastPayment, setLastPayment] = useState(null);

  /**
   * ФАЗА 1: Клиент выбирает исполнителя
   * - Замораживаем деньги
   * - Отправляем 15₽ платформе
   */
  const selectContractor = useCallback(async (userId, dealId, proposedPrice, contractorId) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      // 1. Проверяем баланс и замораживаем
      const freezeResult = await walletService.freezeBalanceForDeal(
        userId,
        dealId,
        proposedPrice
      );

      if (!freezeResult.success) {
        setPaymentError(freezeResult.error);
        setIsProcessing(false);
        return { success: false, error: freezeResult.error };
      }

      // 2. Обновляем статус deal
      await dealService.updateDeal(dealId, { status: 'accepted' });

      setLastPayment({
        type: 'selection',
        dealId,
        amount: proposedPrice,
        status: 'completed',
      });

      setIsProcessing(false);
      return { success: true, dealId, frozen: proposedPrice };
    } catch (error) {
      console.error('Error selecting contractor:', error);
      setPaymentError(error.message);
      setIsProcessing(false);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * ФАЗА 2: Оплата 15₽ за подтверждение
   * - Платим через YooKassa
   * - Разблокируем контакты
   */
  const confirmSelection = useCallback(async (userId, dealId, customerEmail) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      // 1. Создаём платёж в YooKassa
      const paymentResult = await paymentService.confirmSelectionPayment(
        userId,
        dealId,
        customerEmail
      );

      if (!paymentResult.success) {
        setPaymentError(paymentResult.error);
        setIsProcessing(false);
        return { success: false, error: paymentResult.error };
      }

      // 2. Создаём запись платежа в Firestore
      const paymentId = await firebasePaymentService.createPayment(
        dealId,
        userId,
        'confirmation',
        15
      );

      // 3. Разблокируем контакты клиента
      await dealService.unlockClientContacts(dealId);

      // 4. Обновляем статус deal
      await dealService.updateDealStatus(dealId, 'confirmed');

      setLastPayment({
        type: 'confirmation',
        dealId,
        amount: 15,
        paymentId: paymentResult.paymentId,
        confirmationUrl: paymentResult.confirmationUrl,
      });

      setIsProcessing(false);
      return {
        success: true,
        confirmationUrl: paymentResult.confirmationUrl,
        paymentId: paymentResult.paymentId,
      };
    } catch (error) {
      console.error('Error confirming selection:', error);
      setPaymentError(error.message);
      setIsProcessing(false);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * ОТМЕНА БЕЗ ШТРАФА (>= 45 минут)
   */
  const cancelDealEarly = useCallback(async (userId, dealId, proposedPrice) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const result = await walletService.cancelDealEarly(userId, dealId, proposedPrice);

      if (!result.success) {
        setPaymentError(result.error);
        setIsProcessing(false);
        return { success: false, error: result.error };
      }

      // Обновляем статус deal
      await dealService.updateDealStatus(dealId, 'cancelled_client');

      setIsProcessing(false);
      return result;
    } catch (error) {
      console.error('Error cancelling deal early:', error);
      setPaymentError(error.message);
      setIsProcessing(false);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * ОТМЕНА СО ШТРАФОМ (< 45 минут)
   */
  const cancelDealWithPenalty = useCallback(
    async (userId, contractorId, dealId, proposedPrice) => {
      setIsProcessing(true);
      setPaymentError(null);

      try {
        const result = await walletService.cancelDealWithPenalty(
          userId,
          contractorId,
          dealId,
          proposedPrice
        );

        if (!result.success) {
          setPaymentError(result.error);
          setIsProcessing(false);
          return { success: false, error: result.error };
        }

        // Обновляем статус deal
        await dealService.updateDealStatus(dealId, 'cancelled_client_late');

        setIsProcessing(false);
        return result;
      } catch (error) {
        console.error('Error cancelling deal with penalty:', error);
        setPaymentError(error.message);
        setIsProcessing(false);
        return { success: false, error: error.message };
      }
    },
    []
  );

  /**
   * ЗАВЕРШЕНИЕ СДЕЛКИ
   * Деньги идут исполнителю
   */
  const completeDeal = useCallback(async (dealId, contractorId, proposedPrice, dealCount) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const result = await walletService.completeDeal(
        dealId,
        contractorId,
        proposedPrice,
        dealCount
      );

      if (!result.success) {
        setPaymentError(result.error);
        setIsProcessing(false);
        return { success: false, error: result.error };
      }

      // Обновляем статус deal
      await dealService.updateDealStatus(dealId, 'completed');
      await dealService.unlockContractorContacts(dealId);

      setIsProcessing(false);
      return result;
    } catch (error) {
      console.error('Error completing deal:', error);
      setPaymentError(error.message);
      setIsProcessing(false);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * ПОПОЛНИТЬ БАЛАНС
   */
  const addBalance = useCallback(async (userId, amount) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const result = await walletService.addBalance(userId, amount);

      if (!result.success) {
        setPaymentError(result.error);
        setIsProcessing(false);
        return { success: false, error: result.error };
      }

      setIsProcessing(false);
      return result;
    } catch (error) {
      console.error('Error adding balance:', error);
      setPaymentError(error.message);
      setIsProcessing(false);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * ВЫВЕСТИ ДЕНЬГИ
   */
  const withdrawBalance = useCallback(async (userId, amount) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const result = await walletService.withdrawBalance(userId, amount);

      if (!result.success) {
        setPaymentError(result.error);
        setIsProcessing(false);
        return { success: false, error: result.error };
      }

      setIsProcessing(false);
      return result;
    } catch (error) {
      console.error('Error withdrawing balance:', error);
      setPaymentError(error.message);
      setIsProcessing(false);
      return { success: false, error: error.message };
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

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within PaymentProvider');
  }
  return context;
};
