// src/api/chatsAPI.js
import { sendPushNotification } from '../services/notificationService';
import { v4 as uuidv4 } from 'uuid';

// 🔥 Место для реального backend URL
const API_URL = 'https://your-backend-url.com/api';

// =========================
//   Получение истории чата
// =========================
export async function fetchChatMessages(chatId) {
  try {
    const res = await fetch(`${API_URL}/chats/${chatId}/messages`);
    const json = await res.json();
    return json.messages || [];
  } catch (err) {
    console.warn('fetchChatMessages error:', err);
    return [];
  }
}

// =========================
//   Отправка сообщения
// =========================
export async function sendMessage(chatId, messageData) {
  try {
    const payload = {
      id: uuidv4(),
      ...messageData,
    };

    await fetch(`${API_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // пуш сотруднику / партнеру
    if (payload.receiverExpoToken) {
      await sendPushNotification(
        payload.receiverExpoToken,
        'Новое сообщение',
        payload.text,
        { chatId }
      );
    }

    return payload;
  } catch (err) {
    console.warn('sendMessage error:', err);
    return null;
  }
}

// =========================
//   Реалтайм подписка
// =========================
//
// Здесь пример — Firestore/WebSocket/Supabase не важны.
// Ты заменишь на свой источник.
//
// callback(message)
// возвращает новое сообщение

export function subscribeToChat(chatId, callback) {
  // DEMO version — имитация realtime через SSE или WebSocket
  // Подставь свою реализацию

  console.log('subscribeToChat (mock) started for chat:', chatId);

  const interval = setInterval(() => {
    // Фейковые сообщения — чтобы показать работу
    // Удалишь на проде
    const random = Math.random() < 0.03; // 3%
    if (random) {
      callback({
        id: uuidv4(),
        text: 'Авто-сообщение (mock realtime)',
        senderId: 'system',
        createdAt: Date.now(),
      });
    }
  }, 3000);

  return () => clearInterval(interval);
}
