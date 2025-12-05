// src/services/paymentOrchestration.js

import paymentService from "./paymentService";
import { paymentService as fsPaymentService } from "./firebaseService";
import { dealService } from "./dealService";
import { walletService } from "./walletService";

const POLL_INTERVAL = 3000;
const MAX_POLL_ATTEMPTS = 20;

export const confirmSelectionAndUnlock = async ({
  userId,
  dealId,
  contractorId,
  customerEmail,
  role = "client",
}) => {
  try {
    // -----------------------------
    // 1. Создаём внешний платёж (Юкасса / mock)
    // -----------------------------
    const createRes = await paymentService.confirmSelectionPayment(
      userId,
      dealId,
      customerEmail
    );

    if (!createRes || !createRes.success) {
      return {
        success: false,
        error: createRes?.error || "payment_create_failed",
      };
    }

    const externalPaymentId =
      createRes.paymentId || createRes.id || null;

    const confirmationUrl =
      createRes.confirmationUrl ||
      createRes.confirmation?.confirmation_url ||
      null;

    // -----------------------------
    // 2. Создаём платеж в Firestore
    // -----------------------------

    const fsCreate = await fsPaymentService.createPayment(
      dealId,
      userId,
      "confirmation",
      15
    );

    const firestorePaymentId = fsCreate?.paymentId;
    if (!firestorePaymentId) {
      return { success: false, error: "firestore_payment_failed" };
    }

    // Устанавливаем статус pending
    await fsPaymentService.updatePaymentStatus(
      firestorePaymentId,
      "pending"
    );

    // -----------------------------
    // 3. Запускаем polling статуса внешнего платежа
    // -----------------------------

    const pollPromise = new Promise(async (resolve) => {
      let attempts = 0;

      while (attempts < MAX_POLL_ATTEMPTS) {
        attempts++;

        const statusRes = await paymentService.getPaymentStatus(
          externalPaymentId
        );
        const status = statusRes?.status;

        if (status) {
          await fsPaymentService.updatePaymentStatus(
            firestorePaymentId,
            status
          );
        }

        // УСПЕШНАЯ ОПЛАТА
        if (["succeeded", "captured", "paid"].includes(status)) {
          // Обновляем сделку
          await dealService.updateDealStatus(dealId, "confirmed");

          if (role === "client") {
            await dealService.unlockClientContacts(dealId);
          } else {
            await dealService.unlockContractorContacts(dealId);
          }

          resolve({
            success: true,
            status,
            confirmationUrl,
            firestorePaymentId,
          });
          return;
        }

        // НЕУДАЧА / ОТКАЗ
        if (["canceled", "failed"].includes(status)) {
          resolve({
            success: false,
            status,
            confirmationUrl,
            firestorePaymentId,
          });
          return;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }

      resolve({ success: false, error: "timeout" });
    });

    return {
      success: true,
      confirmationUrl,
      firestorePaymentId,
      externalPaymentId,
      pollPromise,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
