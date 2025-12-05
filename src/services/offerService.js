// src/services/offerService.js
import {
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseService';

/**
 * Статусы оффера:
 * - pending — ожидание ответа от исполнителя
 * - accepted — исполнитель принял и предложил цену
 * - declined — исполнитель отклонил
 * - chosen — клиент выбрал этого исполнителя (далее создаётся deal)
 */

export const offerService = {
  /**
   * Исполнитель принимает оффер и указывает цену.
   * Возвращает обновлённый оффер.
   */
  acceptOffer: async (offerId, contractorId, proposedPrice) => {
    try {
      const offerRef = doc(db, 'offers', offerId);
      // Простая защита: проверяем, что оффер принадлежит этому исполнителю и он не истёк
      const offerSnap = await getDoc(offerRef);
      if (!offerSnap.exists()) {
        return { success: false, error: 'offer_not_found' };
      }
      const offer = offerSnap.data();

      if (offer.contractorId !== contractorId) {
        return { success: false, error: 'not_your_offer' };
      }
      if (offer.status !== 'pending') {
        return { success: false, error: 'offer_not_pending' };
      }
      if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
        return { success: false, error: 'offer_expired' };
      }

      await updateDoc(offerRef, {
        status: 'accepted',
        proposedPrice,
        acceptedAt: new Date().toISOString(),
      });

      // TODO: notify client that offer accepted (placeholder)
      // notifyClient(offer.orderId, offerId);

      return { success: true, offerId, proposedPrice };
    } catch (error) {
      console.error('offerService.acceptOffer error', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * Исполнитель отклоняет оффер
   */
  declineOffer: async (offerId, contractorId) => {
    try {
      const offerRef = doc(db, 'offers', offerId);
      const offerSnap = await getDoc(offerRef);
      if (!offerSnap.exists()) return { success: false, error: 'offer_not_found' };
      const offer = offerSnap.data();

      if (offer.contractorId !== contractorId) return { success: false, error: 'not_your_offer' };

      await updateDoc(offerRef, {
        status: 'declined',
        declinedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('offerService.declineOffer error', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * Клиент выбирает оффер — атомарно создаём документ сделки (deal)
   * и отмечаем оффер как chosen. Если другой оффер уже выбран — транзакция упадёт.
   * Возвращаем dealId и data.
   */
  chooseOffer: async (offerId, clientId) => {
    try {
      const offerRef = doc(db, 'offers', offerId);

      // Используем транзакцию, чтобы atomically:
      // 1) проверить что offer.status === 'accepted'
      // 2) проверить order не имеет selectedOfferId (чтобы не выбрать дважды)
      // 3) создать deal doc
      // 4) обновить offer.status = 'chosen' и записать dealId
      const result = await runTransaction(db, async (tx) => {
        const offerSnap = await tx.get(offerRef);
        if (!offerSnap.exists()) throw new Error('offer_not_found');

        const offer = offerSnap.data();
        if (offer.status !== 'accepted') throw new Error('offer_not_accepted');

        // проверим order doc
        const orderRef = doc(db, 'orders', offer.orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists()) throw new Error('order_not_found');

        const order = orderSnap.data();
        if (order.selectedOfferId) throw new Error('order_already_matched');

        // 3) создаём deal документ (статус selection_pending)
        const dealsCol = collection(db, 'deals');
        const dealData = {
          orderId: offer.orderId,
          clientId,
          contractorId: offer.contractorId,
          price: offer.proposedPrice,
          status: 'selection_pending', // далее клиент оплачивает подтверждение
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const dealRef = await addDoc(dealsCol, dealData);

        // 4) обновляем оффер и заказ
        tx.update(offerRef, {
          status: 'chosen',
          chosenAt: new Date().toISOString(),
          dealId: dealRef.id,
        });

        tx.update(orderRef, {
          selectedOfferId: offerId,
          selectedDealId: dealRef.id,
          updatedAt: serverTimestamp(),
        });

        return { dealId: dealRef.id, offerId, orderId: offer.orderId };
      });

      return { success: true, ...result };
    } catch (error) {
      console.error('offerService.chooseOffer error', error);
      return { success: false, error: error.message || String(error) };
    }
  },
};

export default offerService;
