// src/services/matchService.js
import { professionalsAPI } from './api';
import {
  collection,
  addDoc,
  writeBatch,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebaseService';
import { sendPushNotification } from './sendPushNotification';

/**
 * Match Service
 * - TOP_N автоподбор (по distance/rating)
 * - Умный лимит активных офферов на заказ
 * - Защита от дублей (тот же contractor для order)
 * - Batch создание офферов + expiresAt (TTL)
 */

const TOP_N = 5; // топ кандидатов для рассылки (по промпту). :contentReference[oaicite:6]{index=6}
const MAX_ACTIVE_OFFERS_PER_ORDER = 5; // умный лимит откликов/заказ (настройка)
const OFFER_TTL_MS = 10 * 60 * 1000; // 10 минут. :contentReference[oaicite:7]{index=7}

export const matchService = {
  /**
   * startMatching(order)
   * - Берёт топ кандидатов по professionalsAPI
   * - Фильтрует по категории и доступности
   * - Учитывает уже существующие активные офферы для order
   * - Создаёт офферы пакетно (batch)
   *
   * Возвращает { success, createdOffers: [], skipped: [], error }
   */
  startMatching: async (order, opts = {}) => {
    const topN = opts.topN || TOP_N;
    const maxActive = opts.maxActive || MAX_ACTIVE_OFFERS_PER_ORDER;

    try {
      if (!order || !order.id) {
        throw new Error('order_required');
      }

      const lat = order.latitude;
      const lon = order.longitude;
      const categoryId = order.categoryId || null;

      // 1) Получаем кандидатов (локально / proxied API)
      let candidates = [];
      if (lat && lon) {
        candidates = await professionalsAPI.getNearby(
          lat,
          lon,
          50, // расширенный радиус для выбора ТОП-N
          categoryId
        );
      } else {
        candidates = await professionalsAPI.getAll();
      }

      // 2) Фильтрация по категории и базовые значения
      if (categoryId) {
        candidates = candidates.filter((p) => p.categoryId === categoryId);
      }

      candidates = candidates
        .map((p) => ({
          ...p,
          distance: p.distance != null ? p.distance : 999,
          rating: p.rating != null ? p.rating : 0,
        }))
        .sort((a, b) => {
          if (a.distance !== b.distance) return a.distance - b.distance;
          return b.rating - a.rating;
        });

      // 3) Узнаём сколько уже активных офферов есть по этому заказу
      const offersCol = collection(db, 'offers');
      const activeQuery = query(
        offersCol,
        where('orderId', '==', order.id),
        // status pending/accepted are active; we can't query multiple values easily without composite index,
        // so fetch recent offers and filter client-side (acceptable for moderate volumes).
      );

      const activeSnap = await getDocs(activeQuery);
      const now = Date.now();
      const existingActiveOffers = activeSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((of) => {
          // active if not expired and status is pending/accepted
          if (!of.status) return false;
          const activeStatuses = ['pending', 'accepted'];
          if (!activeStatuses.includes(of.status)) return false;
          if (of.expiresAt && new Date(of.expiresAt).getTime() < now) return false;
          return true;
        });

      const curActiveCount = existingActiveOffers.length;
      if (curActiveCount >= maxActive) {
        return {
          success: true,
          createdOffers: [],
          skipped: candidates.slice(0, topN).map((c) => ({ id: c.id, reason: 'order_limit_reached' })),
          message: 'order_active_offers_limit_reached',
        };
      }

      // 4) Выбираем кандидатов: исключаем тех, у кого уже есть active offer на этот order
      const existingContractorIds = new Set(existingActiveOffers.map((o) => o.contractorId));
      const filteredCandidates = candidates.filter((c) => !existingContractorIds.has(c.id));

      // 5) Возьмём кандидатов до topN, но также не превысим maxActive
      const slotsLeft = Math.max(0, maxActive - curActiveCount);
      const desiredCount = Math.min(topN, slotsLeft);
      const topCandidates = filteredCandidates.slice(0, desiredCount);

      if (!topCandidates.length) {
        return {
          success: true,
          createdOffers: [],
          skipped: [],
          message: 'no_candidates_or_no_slots',
        };
      }

      // 6) Batch создание офферов
      const batch = writeBatch(db);
      const createdOffers = [];
      const skipped = [];

      for (const candidate of topCandidates) {
        // Защита: убедимся, что у кандидата нет другого оффера (доп. check)
        if (existingContractorIds.has(candidate.id)) {
          skipped.push({ id: candidate.id, reason: 'duplicate' });
          continue;
        }

        const offerDocRef = collection(db, 'offers'); // we'll use addDoc outside batch because Firestore batch doesn't support addDoc -> use generated ref
        // NOTE: writeBatch with server-generated id requires doc(doc(collection)) creation; create new doc ref with id
        // but for simplicity here we create a new doc ref with auto id using doc() helper (not imported) — instead use a pattern:
      }

      // Because Firestore writeBatch cannot use addDoc (auto id) directly in web SDK,
      // we will create manual doc refs with IDs and batch.set them.
      // Implement with a second loop generating refs.

      // create refs
      const { doc: docFn } = await import('firebase/firestore');
      const offersColRef = collection(db, 'offers');

      for (const candidate of topCandidates) {
        const newDocRef = docFn(offersColRef); // auto id
        const expiresAt = new Date(Date.now() + OFFER_TTL_MS).toISOString();
        const offerDoc = {
          orderId: order.id,
          contractorId: candidate.id,
          status: 'pending',
          proposedPrice: null,
          createdAt: new Date().toISOString(),
          expiresAt,
          orderSnapshot: {
            address: order.address || null,
            shortDesc: order.description ? order.description.slice(0, 200) : '',
          },
          meta: {
            matchedBy: 'topN',
            matchedAt: new Date().toISOString(),
            matchAlgorithmVersion: 1
          }
        };
        batch.set(newDocRef, offerDoc);
        createdOffers.push({ id: newDocRef.id, ...offerDoc });
      }

      // commit batch
      await batch.commit();

      // 7) Отправляем пуши (после успешного commit)
      for (const c of createdOffers) {
        try {
          // Try to lookup pushToken from candidates list (we have candidate data in topCandidates)
          const candidate = topCandidates.find((p) => p.id === c.contractorId);
          if (candidate?.pushToken) {
            sendPushNotification(candidate.pushToken, {
              title: 'Новое предложение!',
              body: `Новый заказ рядом: ${order.description ? order.description.slice(0, 50) : ''}`,
              data: {
                offerId: c.id,
                orderId: order.id,
                type: 'new-offer',
              },
            });
          }
        } catch (e) {
          console.warn('push error for contractor', c.contractorId, e?.message || e);
        }
      }

      return { success: true, createdOffers, skipped };
    } catch (error) {
      console.error('matchService.startMatching error', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * Helper: seedMatchingFromOrderId (публичный вызов из OrderContext)
   * Поддерживает backward compatibility: если передан orderId, подгружает order через orders collection.
   */
  startMatchingByOrderId: async (orderId, opts = {}) => {
    try {
      if (!orderId) throw new Error('orderId_required');
      const ordersCol = collection(db, 'orders');
      const orderSnapQ = query(ordersCol, where('id', '==', orderId));
      const snaps = await getDocs(orderSnapQ);
      const docSnap = snaps.docs[0];
      if (!docSnap) throw new Error('order_not_found');
      const order = { id: docSnap.id, ...docSnap.data() };
      return matchService.startMatching(order, opts);
    } catch (err) {
      console.error('startMatchingByOrderId error', err);
      return { success: false, error: err.message || String(err) };
    }
  },
};

export default matchService;
