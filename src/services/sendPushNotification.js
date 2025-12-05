// src/services/sendPushNotification.js

/**
 * sendPushNotification
 * Универсальная утилита для отправки Expo push-уведомлений.
 * 
 * token — Expo push token исполнителя (например, ExponentPushToken[...] )
 * title, body — текст уведомления
 * data — любые дополнительные данные (например offerId)
 */

export async function sendPushNotification(token, { title, body, data = {} }) {
  if (!token) {
    console.log('⚠️ sendPushNotification — токен пустой, пуш не отправлен');
    return;
  }

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      }),
    });
  } catch (e) {
    console.log('❌ sendPushNotification error:', e);
  }
}
