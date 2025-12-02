import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { walletService } from '../services/walletService';
// при необходимости позже вынесем в отдельный dealService

const DealContext = createContext(null);

export const DealProvider = ({ children }) => {
  const { user } = useAuth();
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const loadUserDeals = useCallback(
    async ({ role = 'client' } = {}) => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        const userDeals = await walletService.getUserDeals({
          userId: user.uid,
          role,
        });

        setDeals(userDeals || []);
      } catch (e) {
        console.error('loadUserDeals error', e);
        setError(e?.message || 'Не удалось загрузить сделки');
        Alert.alert('Ошибка', 'Не удалось загрузить сделки');
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const createDeal = useCallback(
    async ({ orderId, clientId, professionalId, amount, meta = {} }) => {
      if (!user) {
        Alert.alert('Ошибка', 'Необходимо войти в аккаунт');
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 1. Проверяем баланс клиента
        const hasBalance = await walletService.hasSufficientBalance({
          userId: clientId,
          amount,
        });

        if (!hasBalance) {
          Alert.alert('Недостаточно средств', 'Пополните баланс, чтобы создать сделку');
          return null;
        }

        // 2. Замораживаем сумму
        const freezeResult = await walletService.freezeAmount({
          userId: clientId,
          amount,
          reason: 'deal_created',
          orderId,
          professionalId,
        });

        if (!freezeResult?.success) {
          Alert.alert('Ошибка', 'Не удалось заморозить средства для сделки');
          return null;
        }

        // 3. Создаём документ сделки
        const newDeal = await walletService.createDealDocument({
          orderId,
          clientId,
          professionalId,
          amount,
          status: 'pending', // pending | accepted | in_progress | completed | canceled
          frozenTransactionId: freezeResult.transactionId,
          meta,
        });

        setDeals((prev) => [...prev, newDeal]);
        return newDeal;
      } catch (e) {
        console.error('createDeal error', e);
        setError(e?.message || 'Не удалось создать сделку');
        Alert.alert('Ошибка', 'Не удалось создать сделку');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const acceptDeal = useCallback(async (dealId) => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedDeal = await walletService.updateDealStatus({
        dealId,
        status: 'accepted',
      });

      setDeals((prev) => prev.map((d) => (d.id === dealId ? updatedDeal : d)));
      return updatedDeal;
    } catch (e) {
      console.error('acceptDeal error', e);
      setError(e?.message || 'Не удалось принять сделку');
      Alert.alert('Ошибка', 'Не удалось принять сделку');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startDeal = useCallback(async (dealId) => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedDeal = await walletService.updateDealStatus({
        dealId,
        status: 'in_progress',
      });

      setDeals((prev) => prev.map((d) => (d.id === dealId ? updatedDeal : d)));
      return updatedDeal;
    } catch (e) {
      console.error('startDeal error', e);
      setError(e?.message || 'Не удалось перевести сделку в работу');
      Alert.alert('Ошибка', 'Не удалось перевести сделку в работу');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelDeal = useCallback(async (dealId, { reason } = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const canceledDeal = await walletService.cancelDealWithUnfreeze({
        dealId,
        reason,
      });

      setDeals((prev) => prev.map((d) => (d.id === dealId ? canceledDeal : d)));
      return canceledDeal;
    } catch (e) {
      console.error('cancelDeal error', e);
      setError(e?.message || 'Не удалось отменить сделку');
      Alert.alert('Ошибка', 'Не удалось отменить сделку');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeDeal = useCallback(async (dealId, { withPenalty = false, penaltyAmount = 0 } = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const completedDeal = await walletService.completeDealWithTransfer({
        dealId,
        withPenalty,
        penaltyAmount,
      });

      setDeals((prev) => prev.map((d) => (d.id === dealId ? completedDeal : d)));
      return completedDeal;
    } catch (e) {
      console.error('completeDeal error', e);
      setError(e?.message || 'Не удалось завершить сделку');
      Alert.alert('Ошибка', 'Не удалось завершить сделку');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    deals,
    isLoading,
    error,
    resetError,
    loadUserDeals,
    createDeal,
    acceptDeal,
    startDeal,
    cancelDeal,
    completeDeal,
  };

  return <DealContext.Provider value={value}>{children}</DealContext.Provider>;
};

export const useDeal = () => {
  const ctx = useContext(DealContext);
  if (!ctx) {
    throw new Error('useDeal must be used within DealProvider');
  }
  return ctx;
};
