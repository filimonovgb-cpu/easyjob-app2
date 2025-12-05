// src/contexts/PaymentContext.js

import React, { createContext, useState } from "react";
import { Text } from "react-native";
import { confirmSelectionAndUnlock } from "../services/paymentOrchestration";

export const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [lastPayment, setLastPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  /**
   * CONFIRM SELECTION WRAPPER
   * — обёртка над paymentOrchestration.confirmSelectionAndUnlock()
   * — PaymentContext отвечает только за состояние
   */
  const confirmSelection = async ({
    userId,
    dealId,
    contractorId,
    email,
    role,
  }) => {
    setLoading(true);
    setPaymentError(null);

    try {
      const result = await confirmSelectionAndUnlock({
        userId,
        dealId,
        contractorId,
        customerEmail: email,
        role,
      });

      setLastPayment(result);

      // Фоновый poll — обновляет состояние после завершения
      if (result?.pollPromise) {
        result.pollPromise.then((pollRes) => {
          setLastPayment(pollRes);
        });
      }

      return result;
    } catch (err) {
      setPaymentError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * DEFENSIVE CHILD RENDERING
   * (чтобы небыло ошибки "Text strings must be rendered within a <Text>")
   */
  const renderSafeChildren = (c) => {
    const arr = React.Children.toArray(c);
    return arr.map((child, i) => {
      if (typeof child === "string" || typeof child === "number") {
        return <Text key={`pc_txt_${i}`}>{String(child)}</Text>;
      }
      return child;
    });
  };

  return (
    <PaymentContext.Provider
      value={{
        confirmSelection,
        lastPayment,
        loading,
        paymentError,
      }}
    >
      {renderSafeChildren(children)}
    </PaymentContext.Provider>
  );
};
