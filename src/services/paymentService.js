// src/services/paymentService.js

import axios from 'axios';

const YOOKASSA_SHOP_ID = process.env.EXPO_PUBLIC_YOOKASSA_SHOP_ID || '148597';
const YOOKASSA_SECRET_KEY = process.env.EXPO_PUBLIC_YOOKASSA_SECRET_KEY || 'test_secret';
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
   */
  async createPayment(amount, description, metadata = {}) {
    try {
      const idempotenceKey = `${Date.now()}_${Math.random()}`;

      const paymentData = {
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB',
        },
        confirmation: {
          type: 'redirect',
          return_url: 'easyjob://payment-success',
        },
        description,
        metadata,
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
              vat_code: '1',
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
        ...response.data,  // ← Исправлено
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
   * ПОДТВЕРДИТЬ ПЛАТЁЖ (15₽)
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
   * ОСНОВНОЙ ПЛАТЁЖ ЗА УСЛУГУ
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
   * СТАТУС ПЛАТЕЖА
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
        status: response.data.status,
        amount: response.data.amount.value,
        ...response.data,  // ← Исправлено
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
   * РЕФАНД (ВОЗВРАТ)
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
        ...response.data,  // ← Исправлено
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
   * СИМУЛЯЦИЯ WEBHOOK
   */
  async simulateWebhook(paymentId, status) {
    try {
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
   * MOCK ПЛАТЁЖ (Expo Go)
   */
  async testPayment(amount, dealId) {
    try {
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
        }, 1500);
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new PaymentService();
