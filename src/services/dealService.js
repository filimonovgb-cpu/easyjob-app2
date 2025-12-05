// src/services/dealService.js
// Unified deal service — works on client side, uses walletService for all money ops,
// uses paymentOrchestration for external confirmation payments, and updates Firestore.

import { db } from './firebaseService';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

import walletService from './walletService';
import { paymentOrchestration } from './paymentOrchestration';
import { sendPushNotification } from './sendPushNotification';

const DEAL_STATUSES = {
  PENDING: 'pending',
  EXECUTOR_SELECTED: 'executor_selected', // contractor chosen, waiting acceptance
  WAITING_CLIENT_CONFIRMATION: 'waiting_client_confirmation', // contractor accepted, waiting client payment/confirm
  CONFIRMED: 'confirmed', // confirmation payment done (15₽), contacts unlocked
  IN_PROGRESS: 'in_progress', // client confirmed start / work started
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
};

const OFFERS_COLLECTION = 'offers';
const DEALS_COLLECTION = 'deals';
const ORDERS_COLLECTION = 'orders';

class DealService {
  /**
   * Создать сделку на основе оффера
   * - Проверяет оффер
   * - Попытка заморозки средств (walletService.freezeBalanceForDeal)
   * - Создаёт документ сделки (walletService.createDealDocument)
   * - Обновляет статус оффера -> accepted
   * - Возвращает созданную сделку
   *
   * params:
   * { offerId, orderId, clientId, contractorId, amount }
   */
  async createDealFromOffer({ offerId, orderId, clientId, contractorId, amount, scheduledAt = null, meta = {} }) {
    try {
      // 1. Проверяем оффер
      const offerRef = doc(db, OFFERS_COLLECTION, offerId);
      const offerSnap = await getDoc(offerRef);
      if (!offerSnap.exists()) {
        return { success: false, error: 'offer_not_found' };
      }
      const offer = offerSnap.data();
      // Check offer not expired and status pending
      const now = Date.now();
      if (offer.expiresAt && new Date(offer.expiresAt).getTime() < now) {
        return { success: false, error: 'offer_expired' };
      }
      if (offer.status && offer.status !== 'pending') {
        return { success: false, error: 'offer_not_pending' };
      }

      // 2. Attempt to freeze client's balance (charges platform fee and freezes amount)
      const dealIdCandidate = `${orderId}_${contractorId}`; // deterministic id
      const freezeRes = await walletService.freezeBalanceForDeal(clientId, dealIdCandidate, amount);
      if (!freezeRes || !freezeRes.success) {
        return { success: false, error: 'freeze_failed', details: freezeRes };
      }

      // 3. Create deal document (uses walletService.createDealDocument for consistency/audit)
      const createdDeal = await walletService.createDealDocument({
        orderId,
        clientId,
        contractorId,
        amount,
        status: DEAL_STATUSES.EXECUTOR_SELECTED,
        frozenTransactionId: freezeRes.transactionId || null,
        scheduledAt,
        meta,
      });

      // 4. Update offer status -> accepted (so other systems know)
      await updateDoc(offerRef, {
        status: 'accepted',
        dealId: createdDeal.id,
        updatedAt: serverTimestamp(),
      });

      // 5. Optionally update order status (best-effort)
      try {
        const orderRef = doc(db, ORDERS_COLLECTION, orderId);
        await updateDoc(orderRef, {
          status: 'executor_selected',
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        // non-fatal
        console.warn('Could not update order status:', e?.message || e);
      }

      // 6. Notify contractor (push) if pushToken available in offer/order snapshot
      try {
        const contractorPush = offer.pushToken || (offer.contractorSnapshot && offer.contractorSnapshot.pushToken);
        if (contractorPush) {
          sendPushNotification(contractorPush, {
            title: 'Заказ принят в работу',
            body: `Клиент выбрал ваш оффер. Сумма ₽${amount}.`,
            data: { dealId: createdDeal.id, orderId },
          });
        }
      } catch (e) {
        console.warn('push notification failed', e?.message || e);
      }

      return { success: true, deal: createdDeal };
    } catch (error) {
      console.error('createDealFromOffer error', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Подтверждение выбора (оплата 15₽ и unlock контактов).
   * Использует paymentOrchestration.confirmSelectionAndUnlock
   * Возвращает pollPromise в случае внешней оплаты, чтобы UI мог подождать результат.
   *
   * params: { clientId, dealId, contractorId, customerEmail }
   */
  async confirmSelection({ clientId, dealId, contractorId, customerEmail }) {
    try {
      const res = await paymentOrchestration.confirmSelectionAndUnlock({
        userId: clientId,
        dealId,
        contractorId,
        customerEmail,
        role: 'client',
      });

      if (!res || !res.success) {
        return { success: false, error: res?.error || 'payment_orchestration_failed' };
      }

      // paymentOrchestration will update firestore payment status and, upon success,
      // update deal status to 'confirmed' and call dealService.unlockClientContacts (via orchestration).
      // But ensure deal doc exists and set status to WAITING_CLIENT_CONFIRMATION (if not yet)
      const dealRef = doc(db, DEALS_COLLECTION, dealId);
      const dealSnap = await getDoc(dealRef);
      if (!dealSnap.exists()) {
        return { success: false, error: 'deal_not_found' };
      }
      const deal = dealSnap.data();

      // set status to waiting client confirmation (if still executor_selected)
      if (deal.status === DEAL_STATUSES.EXECUTOR_SELECTED || deal.status === DEAL_STATUSES.PENDING) {
        await updateDoc(dealRef, {
          status: DEAL_STATUSES.WAITING_CLIENT_CONFIRMATION,
          updatedAt: serverTimestamp(),
        });
      }

      // return the orchestration result so caller can await pollPromise
      return { success: true, ...res };
    } catch (error) {
      console.error('confirmSelection error', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Клиент подтверждает начало работ (например нажал "Начать" / "Подтвердить выполнение")
   * В текущей архитектуре деньги уже заморожены в createDealFromOffer,
   * поэтому здесь просто переводим статус в IN_PROGRESS.
   */
  async clientConfirmStart(dealId) {
    try {
      const dealRef = doc(db, DEALS_COLLECTION, dealId);
      const snap = await getDoc(dealRef);
      if (!snap.exists()) throw new Error('deal_not_found');
      const deal = snap.data();

      // Update status -> in_progress
      await updateDoc(dealRef, {
        status: DEAL_STATUSES.IN_PROGRESS,
        updatedAt: serverTimestamp(),
        'timestamps.clientConfirmedStartAt': serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('clientConfirmStart error', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Завершение сделки клиентом — перевод денег исполнителю.
   * Делегируем heavy work в walletService.completeDealWithTransfer (есть в проекте).
   */
  async completeDeal(dealId, opts = { withPenalty: false, penaltyAmount: 0 }) {
    try {
      // walletService.completeDealWithTransfer expects { dealId, withPenalty, penaltyAmount }
      const payout = await walletService.completeDealWithTransfer({
        dealId,
        withPenalty: !!opts.withPenalty,
        penaltyAmount: opts.penaltyAmount || 0,
      });

      // update deal status
      const dealRef = doc(db, DEALS_COLLECTION, dealId);
      await updateDoc(dealRef, {
        status: DEAL_STATUSES.COMPLETED,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        payoutResult: payout,
      });

      // record transaction already done inside walletService
      return { success: true, payout };
    } catch (error) {
      console.error('completeDeal error', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Клиентская отмена сделки.
   * Логика:
   * - если withPenalty === true → вызвать cancelDealWithPenalty (walletService)
   * - иначе → cancelDealEarly
   * В любом случае — обновляем статус сделки в deals collection.
   */
  async clientCancelDeal(dealId, withPenalty = false) {
    try {
      const dealRef = doc(db, DEALS_COLLECTION, dealId);
      const snap = await getDoc(dealRef);
      if (!snap.exists()) throw new Error('deal_not_found');
      const deal = snap.data();

      if (withPenalty) {
        await walletService.cancelDealWithPenalty(deal.clientId, deal.contractorId, dealId, deal.price);
      } else {
        await walletService.cancelDealEarly(deal.clientId, dealId, deal.price);
      }

      await updateDoc(dealRef, {
        status: DEAL_STATUSES.CANCELED,
        canceledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cancelInitiator: 'client',
        penalty: !!withPenalty,
      });

      return { success: true };
    } catch (error) {
      console.error('clientCancelDeal error', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Отмена исполнителем до подтверждения клиента
   */
  async contractorCancelDeal(dealId) {
    try {
      const dealRef = doc(db, DEALS_COLLECTION, dealId);
      const snap = await getDoc(dealRef);
      if (!snap.exists()) throw new Error('deal_not_found');
      const deal = snap.data();

      // If frozen funds exist, simply unfreeze for client (no penalty)
      // walletService.cancelDealEarly signature: (userId, dealId, proposedPrice)
      await walletService.cancelDealEarly(deal.clientId, dealId, deal.price);

      await updateDoc(dealRef, {
        status: DEAL_STATUSES.CANCELED,
        canceledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cancelInitiator: 'contractor',
      });

      return { success: true };
    } catch (error) {
      console.error('contractorCancelDeal error', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Возвращает сделку по ID
   */
  async getDeal(dealId) {
    try {
      const dealRef = doc(db, DEALS_COLLECTION, dealId);
      const snap = await getDoc(dealRef);
      if (!snap.exists()) return null;
      return snap.data();
    } catch (error) {
      console.error('getDeal error', error);
      throw error;
    }
  }

  /**
   * Получить сделки пользователя (client или contractor)
   * role: 'client' | 'contractor'
   */
  async getUserDeals(userId, role = 'client') {
    try {
      const dealsRef = collection(db, DEALS_COLLECTION);
      const field = role === 'contractor' ? 'contractorId' : 'clientId';
      const q = query(dealsRef, where(field, '==', userId));
      const snap = await getDocs(q);
      const deals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return deals.sort((a, b) => {
        const ta = a.createdAt?.seconds || a.createdAt || 0;
        const tb = b.createdAt?.seconds || b.createdAt || 0;
        return tb - ta;
      });
    } catch (error) {
      console.error('getUserDeals error', error);
      throw error;
    }
  }

  /**
   * Helper: ensure offer belongs to order and is pending
   */
  async validateOfferForOrder(offerId, orderId) {
    try {
      const offerRef = doc(db, OFFERS_COLLECTION, offerId);
      const snap = await getDoc(offerRef);
      if (!snap.exists()) return { valid: false, reason: 'not_found' };
      const offer = snap.data();
      if (offer.orderId !== orderId) return { valid: false, reason: 'mismatch_order' };
      if (offer.status !== 'pending') return { valid: false, reason: 'not_pending' };
      if (offer.expiresAt && new Date(offer.expiresAt).getTime() < Date.now()) return { valid: false, reason: 'expired' };
      return { valid: true, offer };
    } catch (error) {
      console.error('validateOfferForOrder error', error);
      return { valid: false, reason: error.message || String(error) };
    }
  }
}

export default new DealService();
