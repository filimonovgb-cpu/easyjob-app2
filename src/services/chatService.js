// src/services/chatService.js
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseService';

/**
 * Chat structure:
 * chats/{chatId} = {
 *   orderId,
 *   clientId,
 *   contractorId,
 *   createdAt
 * }
 *
 * messages/{msgId} = {
 *   chatId,
 *   senderId,
 *   text,
 *   createdAt
 * }
 */

export const chatService = {
  /**
   * Находит чат по orderId или создаёт новый.
   */
  createOrGetChat: async (orderId, clientId, contractorId) => {
    try {
      // поиск чата по orderId
      const chatRef = doc(db, 'chats', orderId); // chatId = orderId (удобно)
      const snap = await getDoc(chatRef);

      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }

      // если нет — создаём
      const newChat = {
        orderId,
        clientId,
        contractorId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(chatRef, newChat);

      return { id: chatRef.id, ...newChat };
    } catch (err) {
      console.log('chatService.createOrGetChat error:', err);
      throw err;
    }
  },

  /**
   * Получить чат по orderId
   */
  getChatByOrderId: async (orderId) => {
    const chatRef = doc(db, 'chats', orderId);
    const snap = await getDoc(chatRef);

    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  /**
   * Получить список чатов пользователя (клиент или исполнитель)
   */
  getUserChats: async (userId) => {
    return new Promise((resolve, reject) => {
      const chatsCol = collection(db, 'chats');
      const q = query(
        chatsCol,
        where('clientId', '==', userId)
      );

      // Клиент
      const unsub1 = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        resolve(list);
      }, reject);
    });
  },

  /**
   * Для исполнителя (контрактор)
   */
  getContractorChats: async (contractorId) => {
    return new Promise((resolve, reject) => {
      const chatsCol = collection(db, 'chats');
      const q = query(
        chatsCol,
        where('contractorId', '==', contractorId)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        resolve(list);
      }, reject);
    });
  },

  /**
   * Отправить сообщение
   */
  sendMessage: async (chatId, senderId, text) => {
    try {
      const messagesCol = collection(db, 'messages');
      await addDoc(messagesCol, {
        chatId,
        senderId,
        text,
        createdAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (e) {
      console.log('sendMessage error', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Подписка на сообщения в чате
   */
  subscribeToMessages: (chatId, callback) => {
    const messagesCol = collection(db, 'messages');
    const q = query(
      messagesCol,
      where('chatId', '==', chatId),
      orderBy('createdAt')
    );

    return onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() }));
      callback(msgs);
    });
  },
};

export default chatService;
