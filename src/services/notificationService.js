// src/services/notificationService.js
/**
 * sendPushNotification
 * Placeholder: отправка пуша через Expo push API.
 *
 * На проде: перенести на сервер, так как клиент не должен содержать логики массовой отправки/секретов.
 *
 * Usage:
 *  import { sendPushNotification } from '../services/notificationService';
 *  await sendPushNotification(token, title, body, { foo: 'bar' });
 */

export async function sendPushNotification(expoPushToken, title = '', body = '', data = {}) {
  try {
    if (!expoPushToken) {
      throw new Error('Expo push token is required');
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    // Expo public push endpoint
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const json = await res.json();
    // json может быть массивом результатов в зависимости от сервиса
    return { success: true, result: json };
  } catch (error) {
    console.warn('sendPushNotification error', error);
    return { success: false, error: error.message || error };
  }
}

export default {
  sendPushNotification,
};
