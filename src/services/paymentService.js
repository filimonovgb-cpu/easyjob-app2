// src/services/paymentService.js

/**
 * Payment Service
 * Интеграция с YooKassa для платежей
 * 15₽ за подтверждение, основная сумма за услуги, штрафы
 */

import axios from 'axios';

/**
 * YooKassa Settings
 * 
 * Тебе нужно:
 * 1. Зарегистрироваться на https://yookassa.ru/
 * 2. Получить Shop ID и Secret Key
 * 3. Заменить YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY
 * 
 * Для тестирования:
 * - Shop ID: 148597 (тестовый)
 * - Secret Key: test_secret
 * 
 * Для продакшена:
 * - Получить реальные от YooKassa
 */

const YOOKASSA_SHOP_ID = process.env.EXPO_PUBLIC_YOOKASSA_SHOP_ID || '148597'; // Тестовый
const YOOKASSA_SECRET_KEY = process.env.EXPO_PUBLIC_YOOKASSA_SECRET_KEY || 'test_secret'; // Тестовый
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/payments';

// Base64 encode для Basic Auth
const getAuthHeader = () => {
  const credentials = `${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
};

class PaymentService {
  /**
   * СОЗДАТЬ ПЛАТЁЖ
   * Инициирует платёж в YooKassa
   * 
   * @param {number} amount - сумма в рублях (15 или больше)
   * @param {string} description - описание платежа
   * @param {object} metadata - данные о сделке
   */
  async createPayment(amount, description, metadata = {}) {
    try {
      const idempotenceKey = `${Date.now()}_${Math.random()}`; // Уникальный ключ

      const paymentData = {
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB',
        },
        confirmation: {
          type: 'redirect', // Для мобильного приложения используем redirect
          return_url: 'easyjob://payment-success', // Custom URL scheme
        },
        description,
        metadata, // Передаём dealId, userId и т.д.
        receipt: {
          customer: {
            email: metadata.customerEmail || 'customer@easyjob.ru',
          },
          items: [
            {
              description,
              quantity: '1.00',
              amount: {
                value: amount.toFixed(2),
                currency: 'RUB',
              },
              vat_code: '1', // Без НДС
            },
          ],
        },
      };

      const response = await axios.post(YOOKASSA_API_URL, paymentData, {
        headers: {
          Authorization: getAuthHeader(),
          'Idempotence-Key': idempotenceKey,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        paymentId: response.data.id,
        confirmationUrl: response.data.confirmation.confirmation_url,
        status: response.data.status,
         response.data,
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  /**
   * ПОДТВЕРДИТЬ ПЛАТЁЖ
   * 15₽ за подтверждение выбора исполнителя
   * Вызывается после выбора исполнителя клиентом
   */
  async confirmSelectionPayment(userId, dealId, customerEmail) {
    try {
      const amount = 15;
      const description = `Confirmation fee for deal #${dealId}`;
      const metadata = {
        dealId,
        userId,
        type: 'confirmation',
        customerEmail,
      };

      return await this.createPayment(amount, description, metadata);
    } catch (error) {
      console.error('Error confirming selection payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ОПЛАТИТЬ УСЛУГУ
   * Основной платёж за услугу исполнителя
   * Вызывается сразу после выбора (замораживается)
   */
  async servicePayment(userId, contractorId, dealId, amount, customerEmail) {
    try {
      const description = `Service payment for deal #${dealId} with contractor #${contractorId}`;
      const metadata = {
        dealId,
        userId,
        contractorId,
        type: 'service',
        customerEmail,
      };

      return await this.createPayment(amount, description, metadata);
    } catch (error) {
      console.error('Error creating service payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ПОЛУЧИТЬ СТАТУС ПЛАТЕЖА
   * Проверяем, прошёл ли платёж
   */
  async getPaymentStatus(paymentId) {
    try {
      const response = await axios.get(`${YOOKASSA_API_URL}/${paymentId}`, {
        headers: {
          Authorization: getAuthHeader(),
        },
      });

      return {
        success: true,
        paymentId: response.data.id,
        status: response.data.status, // pending, succeeded, failed, cancelled
        amount: response.data.amount.value,
         response.data,
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  /**
   * ВЕРНУТЬ ПЛАТЁЖ (РЕФАНД)
   * Если сделка отменена в течение 45 минут (без штрафа)
   */
  async refundPayment(paymentId, amount, reason = 'Deal cancelled') {
    try {
      const idempotenceKey = `refund_${Date.now()}_${Math.random()}`;

      const refundData = {
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB',
        },
        description: reason,
      };

      const response = await axios.post(
        `${YOOKASSA_API_URL}/${paymentId}/refunds`,
        refundData,
        {
          headers: {
            Authorization: getAuthHeader(),
            'Idempotence-Key': idempotenceKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        refundId: response.data.id,
        status: response.data.status,
        amount: response.data.amount.value,
      };
    } catch (error) {
      console.error('Error refunding payment:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  /**
   * WEBHOOK HANDLER
   * YooKassa отправляет уведомления о статусе платежей сюда
   * Это должно быть на backend'е (Firebase Cloud Function)
   * 
   * СИМУЛЯЦИЯ для тестирования в мобильном приложении
   */
  async simulateWebhook(paymentId, status) {
    try {
      // В реальности это приходит с сервера YooKassa
      // Здесь мы симулируем для тестирования
      console.log(`[WEBHOOK] Payment ${paymentId} status changed to ${status}`);

      return {
        success: true,
        message: 'Webhook simulated',
        paymentId,
        status,
      };
    } catch (error) {
      console.error('Error simulating webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ТЕСТОВЫЙ ПЛАТЁЖ (для Expo Go)
   * Если YooKassa недоступна, используем mock
   */
  async testPayment(amount, dealId) {
    try {
      // Симулируем успешный платёж
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            paymentId: `test_payment_${Date.now()}`,
            status: 'succeeded',
            amount,
            dealId,
            message: 'Test payment successful (mock)',
          });
        }, 1500); // Имитируем сетевую задержку
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new PaymentService();
