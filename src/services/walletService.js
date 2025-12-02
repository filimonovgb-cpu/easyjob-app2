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
  collection,
  addDoc,
  getDocs,
  query,
  where,
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
      const platformFee = 15;
      const totalNeeded = platformFee + proposedPrice;

      if ((currentWallet.balance || 0) < totalNeeded) {
        return {
          success: false,
          error: 'Insufficient balance',
          available: currentWallet.balance || 0,
          needed: totalNeeded,
        };
      }

      const newBalance = (currentWallet.balance || 0) - totalNeeded;

      const newFrozen = {
        ...(currentWallet.frozen || {}),
        total: (currentWallet.frozen?.total || 0) + proposedPrice,
        byDeal: {
          ...(currentWallet.frozen?.byDeal || {}),
          [dealId]: proposedPrice,
        },
      };

      await updateDoc(walletRef, {
        balance: newBalance,
        frozen: newFrozen,
        updatedAt: serverTimestamp(),
      });

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

      const newBalance = (currentWallet.balance || 0) + proposedPrice;

      const newFrozen = {
        total: (currentWallet.frozen?.total || 0) - proposedPrice,
        byDeal: { ...(currentWallet.frozen?.byDeal || {}) },
      };
      delete newFrozen.byDeal[dealId];

      await updateDoc(walletRef, {
        balance: newBalance,
        frozen: newFrozen,
        updatedAt: serverTimestamp(),
      });

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

      const clientWalletRef = doc(db, 'users', userId, 'wallet', 'main');
      const clientWalletDoc = await getDoc(clientWalletRef);

      if (!clientWalletDoc.exists()) {
        return { success: false, error: 'Client wallet not found' };
      }

      const clientWallet = clientWalletDoc.data();
      const clientNewBalance = (clientWallet.balance || 0) + refundAmount;

      const newFrozen = {
        total: (clientWallet.frozen?.total || 0) - proposedPrice,
        byDeal: { ...(clientWallet.frozen?.byDeal || {}) },
      };
      delete newFrozen.byDeal[dealId];

      await updateDoc(clientWalletRef, {
        balance: clientNewBalance,
        frozen: newFrozen,
        updatedAt: serverTimestamp(),
      });

      await transactionService.recordTransaction(
        userId,
        'penalty',
        PENALTY_AMOUNT,
        dealId,
        `Late cancellation penalty (< 45 min). ₽${PENALTY_AMOUNT} to contractor`
      );

      const contractorWalletRef = doc(db, 'users', contractorId, 'wallet', 'main');
      const contractorWalletDoc = await getDoc(contractorWalletRef);

      if (!contractorWalletDoc.exists()) {
        // Если документа нет — используем updateDoc может упасть, но сохраняю логику как в оригинале.
        // Если нужно — можно заменить на setDoc; оставляю оригинальное поведение.
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

      await transactionService.recordTransaction(
        contractorId,
        'penalty_compensation',
        PENALTY_AMOUNT,
        dealId,
        'Compensation for client late cancellation'
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
   * 1. Разморозить proposedPrice со счёта клиента (заморозка уже учтена в cancel/complete флоу)
   * 2. Отправить исполнителю (минус комиссия если 4+ сделка)
   * 3. Если 1-3 сделка: 0% комиссия (исполнитель получает полную сумму)
   * 4. Если 4+ сделка: 15% комиссия (исполнитель платит 15₽)
   */
  async completeDeal(dealId, contractorId, proposedPrice, contractorDealCount) {
    try {
      const contractorCommission = contractorDealCount >= 3 ? 15 : 0;
      const amountToContractor = proposedPrice - contractorCommission;

      const contractorWalletRef = doc(db, 'users', contractorId, 'wallet', 'main');
      const contractorWalletDoc = await getDoc(contractorWalletRef);

      let contractorBalance = amountToContractor;

      if (contractorWalletDoc.exists()) {
        contractorBalance =
          (contractorWalletDoc.data().balance || 0) + amountToContractor;
      }

      await updateDoc(contractorWalletRef, {
        balance: contractorBalance,
        updatedAt: serverTimestamp(),
      });

      await transactionService.recordTransaction(
        contractorId,
        'payment',
        amountToContractor,
        dealId,
        `Payment for completed deal (Commission ₽${contractorCommission})`
      );

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

      const newBalance = (walletDoc.data().balance || 0) + amount;

      await updateDoc(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });

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

      if ((currentWallet.balance || 0) < amount) {
        return {
          success: false,
          error: 'Insufficient balance',
          available: currentWallet.balance || 0,
        };
      }

      const newBalance = (currentWallet.balance || 0) - amount;

      await updateDoc(walletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });

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
          balance: 0,
          frozen: { total: 0, byDeal: {} },
          available: 0,
          total: 0,
        };
      }

      const wallet = walletDoc.data();

      return {
        success: true,
        balance: wallet.balance || 0,
        frozen: wallet.frozen || { total: 0, byDeal: {} },
        available: wallet.balance || 0,
        total: (wallet.balance || 0) + (wallet.frozen?.total || 0),
      };
    } catch (error) {
      console.error('Error getting balance info:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ЗАГРУЗИТЬ СДЕЛКИ ПОЛЬЗОВАТЕЛЯ
   * role = 'client' или 'contractor'
   */
  async getUserDeals({ userId, role = 'client' }) {
    try {
      const dealsRef = collection(db, 'deals');
      const field = role === 'contractor' ? 'contractorId' : 'clientId';

      const q = query(dealsRef, where(field, '==', userId));
      const snapshot = await getDocs(q);

      const deals = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      return deals;
    } catch (error) {
      console.error('Error getting user deals:', error);
      throw new Error(error.message || 'Failed to load deals');
    }
  }

  /**
   * СОЗДАНИЕ ДОКУМЕНТА СДЕЛКИ
   * Вызывается после успешной заморозки средств
   */
  async createDealDocument({
    orderId,
    clientId,
    contractorId,
    amount,
    status = 'pending',
    frozenTransactionId,
    scheduledAt = null,
    meta = {},
  }) {
    try {
      const dealsRef = collection(db, 'deals');

      const dealData = {
        orderId,
        clientId,
        contractorId,
        price: amount,
        status,
        scheduledAt,
        frozenTransactionId: frozenTransactionId || null,
        meta,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const dealDocRef = await addDoc(dealsRef, dealData);
      const createdDoc = await getDoc(dealDocRef);

      return {
        id: dealDocRef.id,
        ...createdDoc.data(),
      };
    } catch (error) {
      console.error('Error creating deal document:', error);
      throw new Error(error.message || 'Failed to create deal');
    }
  }

  /**
   * ОБНОВИТЬ СТАТУС СДЕЛКИ
   */
  async updateDealStatus({ dealId, status }) {
    try {
      const dealRef = doc(db, 'deals', dealId);
      const dealSnap = await getDoc(dealRef);

      if (!dealSnap.exists()) {
        throw new Error('Deal not found');
      }

      await updateDoc(dealRef, {
        status,
        updatedAt: serverTimestamp(),
      });

      const updatedSnap = await getDoc(dealRef);
      return { id: updatedSnap.id, ...updatedSnap.data() };
    } catch (error) {
      console.error('Error updating deal status:', error);
      throw new Error(error.message || 'Failed to update deal status');
    }
  }

  /**
   * ОТМЕНА СДЕЛКИ + РАЗМОРОЗКА
   * Пока используем сценарий "без штрафа" (cancelDealEarly),
   * логику времени/штрафа можно будет добавить позже.
   */
  async cancelDealWithUnfreeze({ dealId, reason }) {
    try {
      const dealRef = doc(db, 'deals', dealId);
      const dealSnap = await getDoc(dealRef);

      if (!dealSnap.exists()) {
        throw new Error('Deal not found');
      }

      const deal = dealSnap.data();
      const clientId = deal.clientId;
      const proposedPrice = deal.price;

      // Разморозка без штрафа
      await this.cancelDealEarly(clientId, dealId, proposedPrice);

      // Обновляем статус сделки
      await updateDoc(dealRef, {
        status: 'canceled',
        cancelReason: reason || null,
        updatedAt: serverTimestamp(),
      });

      const updatedSnap = await getDoc(dealRef);
      return { id: updatedSnap.id, ...updatedSnap.data() };
    } catch (error) {
      console.error('Error canceling deal with unfreeze:', error);
      throw new Error(error.message || 'Failed to cancel deal');
    }
  }

  /**
   * ЗАВЕРШЕНИЕ СДЕЛКИ + ПЕРЕВОД ИСПОЛНИТЕЛЮ
   * withPenalty / penaltyAmount оставлены на будущее (штрафы после выполнения)
   */
  async completeDealWithTransfer({ dealId, withPenalty = false, penaltyAmount = 0 }) {
    try {
      const dealRef = doc(db, 'deals', dealId);
      const dealSnap = await getDoc(dealRef);

      if (!dealSnap.exists()) {
        throw new Error('Deal not found');
      }

      const deal = dealSnap.data();
      const { contractorId, price } = deal;

      // TODO: посчитать реальный contractorDealCount (кол-во завершённых сделок)
      const contractorDealCount = 0;

      // Перевод исполнителю (комиссия внутри completeDeal)
      const result = await this.completeDeal(
        dealId,
        contractorId,
        price,
        contractorDealCount
      );

      // Обновляем статус сделки
      await updateDoc(dealRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const updatedSnap = await getDoc(dealRef);
      return {
        id: updatedSnap.id,
        ...updatedSnap.data(),
        payoutResult: result,
      };
    } catch (error) {
      console.error('Error completing deal with transfer:', error);
      throw new Error(error.message || 'Failed to complete deal');
    }
  }
}

export default new WalletService();
