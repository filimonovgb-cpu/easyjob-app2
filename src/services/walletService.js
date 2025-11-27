// src/services/walletService.js

/**
 * Wallet Service
 * Управление балансом, замораживанием, откатом денег
 * Все финансовые операции
 */

import {
  doc,
  updateDoc,
  getDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseService';
import { transactionService } from './firebaseService';

class WalletService {
  /**
   * ОСНОВНАЯ ОПЕРАЦИЯ: Заморозить деньги при выборе исполнителя
   * 
   * Клиент выбрал исполнителя (proposedPrice = 500₽)
   * 1. Отправляем 15₽ платформе (моментально)
   * 2. Замораживаем 500₽ (reserveAmount)
   * 
   * Balance: 1000₽
   * После: available = 1000 - 15 - 500 = 485₽
   */
  async freezeBalanceForDeal(userId, dealId, proposedPrice) {
    try {
      const walletRef = doc(db, 'users', userId, 'wallet', 'main');
      const walletDoc = await getDoc(walletRef);

      if (!walletDoc.exists()) {
        return { success: false, error: 'Wallet not found' };
      }

      const currentWallet = walletDoc.data();
      const platformFee = 15; // Комиссия платформе
      const totalNeeded = platformFee + proposedPrice;

      // Проверяем достаточно ли денег
      if (currentWallet.balance < totalNeeded) {
        return {
          success: false,
          error: 'Insufficient balance',
          available: currentWallet.balance,
          needed: totalNeeded,
        };
      }

      // Отправляем 15₽ платформе (из основного баланса)
      const newBalance = currentWallet.balance - totalNeeded;

      // Замораживаем proposedPrice
      const newFrozen = {
        ...currentWallet.frozen,
        total: currentWallet.frozen.total + proposedPrice,
        byDeal: {
          ...currentWallet.frozen.byDeal,
          [dealId]: proposedPrice,
        },
      };

      // Обновляем кошелёк
      await updateDoc(walletRef, {
        balance: newBalance,
        frozen: newFrozen,
        updatedAt: serverTimestamp(),
      });

      // Записываем транзакцию (комиссия платформе)
      await transactionService.recordTransaction(
        userId,
        'commission',
        platformFee,
        dealId,
        'Commission for deal selection'
      );

      return {
        success: true,
        newBalance,
        frozen: newFrozen.total,
        message: `Frozen ₽${proposedPrice}, Platform fee ₽${platformFee} charged`,
      };
    } catch (error) {
      console.error('Error freezing balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ОТМЕНА БЕЗ ШТРАФА: >= 45 минут до выполнения
   * 
   * Отмена произошла РАНО (больше 45 минут осталось)
   * 1. Возвращаем замороженную сумму (proposedPrice)
   * 2. 15₽ комиссии НЕ возвращаются (уже отчислены)
   * 3. Исполнитель НИЧЕГО не получает
   */
  async cancelDealEarly(userId, dealId, proposedPrice) {
    try {
      const walletRef = doc(db, 'users', userId, 'wallet', 'main');
      const walletDoc = await getDoc(walletRef);

      if (!walletDoc.exists()) {
        return { success: false, error: 'Wallet not found' };
      }

      const currentWallet = walletDoc.data();

      // Возвращаем замороженные деньги
      const newBalance = currentWallet.balance + proposedPrice;

      // Удаляем из frozen
      const newFrozen = { ...currentWallet.frozen };
      delete newFrozen.byDeal[dealId];
      newFrozen.total -= proposedPrice;

      // Обновляем кошелёк
      await updateDoc(walletRef, {
        balance: newBalance,
        frozen: newFrozen,
        updatedAt: serverTimestamp(),
      });

      // Записываем транзакцию (возврат)
      await transactionService.recordTransaction(
        userId,
        'refund',
        proposedPrice,
        dealId,
        'Refund for early cancellation (>45 min before execution)'
      );

      return {
        success: true,
        refunded: proposedPrice,
        newBalance,
        message: `Refunded ₽${proposedPrice}. Commission ₽15 not returned.`,
      };
    } catch (error) {
      console.error('Error cancelling deal early:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ОТМЕНА СО ШТРАФОМ: < 45 минут до выполнения
   * 
   * Отмена произошла ПОЗДНО (меньше 45 минут осталось)
   * 1. Штраф 190₽ автоматически списывается
   * 2. 190₽ отправляется исполнителю (компенсация)
   * 3. Остаток (proposedPrice - 190) возвращается клиенту
   * 4. 15₽ комиссии НЕ возвращаются
   * 
   * Пример: proposedPrice = 500₽
   * - Штраф: 190₽ (исполнителю)
   * - Возврат клиенту: 500 - 190 = 310₽
   */
  async cancelDealWithPenalty(userId, contractorId, dealId, proposedPrice) {
    try {
      const PENALTY_AMOUNT = 190;
      const refundAmount = proposedPrice - PENALTY_AMOUNT;

      // КЛИЕНТ: верни то что осталось после штрафа
      const clientWalletRef = doc(db, 'users', userId, 'wallet', 'main');
      const clientWalletDoc = await getDoc(clientWalletRef);

      if (!clientWalletDoc.exists()) {
        return { success: false, error: 'Client wallet not found' };
      }

      const clientWallet = clientWalletDoc.data();
      const clientNewBalance = clientWallet.balance + refundAmount;

      // Удаляем из frozen
      const newFrozen = { ...clientWallet.frozen };
      delete newFrozen.byDeal[dealId];
      newFrozen.total -= proposedPrice;

      await updateDoc(clientWalletRef, {
        balance: clientNewBalance,
        frozen: newFrozen,
        updatedAt: serverTimestamp(),
      });

      // Записываем транзакцию для клиента
      await transactionService.recordTransaction(
        userId,
        'penalty',
        PENALTY_AMOUNT,
        dealId,
        `Late cancellation penalty (< 45 min). ₽${PENALTY_AMOUNT} to contractor`
      );

      // ИСПОЛНИТЕЛЬ: +190₽ компенсация
      const contractorWalletRef = doc(db, 'users', contractorId, 'wallet', 'main');
      const contractorWalletDoc = await getDoc(contractorWalletRef);

      if (!contractorWalletDoc.exists()) {
        // Создаём кошелёк если его нет
        await updateDoc(contractorWalletRef, {
          balance: PENALTY_AMOUNT,
          frozen: { total: 0, byDeal: {} },
          transactionHistory: [],
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(contractorWalletRef, {
          balance: increment(PENALTY_AMOUNT),
          updatedAt: serverTimestamp(),
        });
      }

      // Записываем транзакцию для исполнителя
      await transactionService.recordTransaction(
        contractorId,
        'penalty_compensation',
        PENALTY_AMOUNT,
        dealId,
        `Compensation for client late cancellation`
      );

      return {
        success: true,
        clientRefund: refundAmount,
        contractorCompensation: PENALTY_AMOUNT,
        message: `Client refunded ₽${refundAmount}, Contractor paid ₽${PENALTY_AMOUNT}`,
      };
    } catch (error) {
      console.error('Error cancelling deal with penalty:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ЗАВЕРШЕНИЕ СДЕЛКИ: Перевод денег исполнителю
   * 
   * Клиент подтвердил выполнение
   * 1. Разморозить proposedPrice со счёта клиента
   * 2. Отправить исполнителю (минус комиссия если 4+ сделка)
   * 3. Если 1-3 сделка: 0% комиссия (исполнитель получает полную сумму)
   * 4. Если 4+ сделка: 15% комиссия (исполнитель платит 15₽)
   */
  async completeDeal(dealId, contractorId, proposedPrice, contractorDealCount) {
    try {
      // Определяем комиссию для исполнителя
      const contractorCommission = contractorDealCount >= 3 ? 15 : 0; // 0 для 1-3, 15 для 4+
      const amountToContractor = proposedPrice - contractorCommission;

      // ИСПОЛНИТЕЛЬ: +деньги
      const contractorWalletRef = doc(db, 'users', contractorId, 'wallet', 'main');
      const contractorWalletDoc = await getDoc(contractorWalletRef);

      let contractorBalance = amountToContractor;
      if (contractorWalletDoc.exists()) {
        contractorBalance = contractorWalletDoc.data().balance + amountToContractor;
      }

      await updateDoc(contractorWalletRef, {
        balance: contractorBalance,
        updatedAt: serverTimestamp(),
      });

      // Записываем транзакцию для исполнителя
      await transactionService.recordTransaction(
        contractorId,
        'payment',
        amountToContractor,
        dealId,
        `Payment for completed deal (Commission ₽${contractorCommission})`
      );

      // Если была комиссия, записываем её отдельно
      if (contractorCommission > 0) {
        await transactionService.recordTransaction(
          contractorId,
          'commission',
          contractorCommission,
          dealId,
          'Platform commission'
        );
      }

      return {
        success: true,
        contractorReceived: amountToContractor,
        commission: contractorCommission,
        message: `Deal completed. Contractor received ₽${amountToContractor} (Commission ₽${contractorCommission})`,
      };
    } catch (error) {
      console.error('Error completing deal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ПОПОЛНЕНИЕ БАЛАНСА
   * Клиент решил добавить денег на счёт
   */
  async addBalance(userId, amount) {
    try {
      const walletRef = doc(db, 'users', userId, 'wallet', 'main');
      const walletDoc = await getDoc(walletRef);

      if (!walletDoc.exists()) {
        return { success: false, error: 'Wallet not found' };
      }

      const newBalance = walletDoc.data().balance + amount;

      await updateDoc(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });

      // Записываем транзакцию
      await transactionService.recordTransaction(
        userId,
        'deposit',
        amount,
        null,
        'Balance top-up'
      );

      return {
        success: true,
        newBalance,
        message: `Added ₽${amount}. New balance: ₽${newBalance}`,
      };
    } catch (error) {
      console.error('Error adding balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ВЫВОД ДЕНЕГ
   * Исполнитель хочет вывести деньги на карту
   */
  async withdrawBalance(userId, amount) {
    try {
      const walletRef = doc(db, 'users', userId, 'wallet', 'main');
      const walletDoc = await getDoc(walletRef);

      if (!walletDoc.exists()) {
        return { success: false, error: 'Wallet not found' };
      }

      const currentWallet = walletDoc.data();

      if (currentWallet.balance < amount) {
        return {
          success: false,
          error: 'Insufficient balance',
          available: currentWallet.balance,
        };
      }

      const newBalance = currentWallet.balance - amount;

      await updateDoc(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });

      // Записываем транзакцию
      await transactionService.recordTransaction(
        userId,
        'withdrawal',
        amount,
        null,
        'Withdrawal to card'
      );

      return {
        success: true,
        withdrawn: amount,
        newBalance,
        message: `Withdrawn ₽${amount}. New balance: ₽${newBalance}`,
      };
    } catch (error) {
      console.error('Error withdrawing balance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ПОЛУЧИТЬ ИНФОРМАЦИЮ О БАЛАНСЕ
   * Показывает свободный + замороженный баланс
   */
  async getBalanceInfo(userId) {
    try {
      const walletRef = doc(db, 'users', userId, 'wallet', 'main');
      const walletDoc = await getDoc(walletRef);

      if (!walletDoc.exists()) {
        return {
          success: true,
           {
            balance: 0,
            frozen: { total: 0, byDeal: {} },
            available: 0,
          },
        };
      }

      const wallet = walletDoc.data();

      return {
        success: true,
         {
          balance: wallet.balance,
          frozen: wallet.frozen,
          available: wallet.balance, // Свободно
          total: wallet.balance + wallet.frozen.total, // Всего
        },
      };
    } catch (error) {
      console.error('Error getting balance info:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new WalletService();
