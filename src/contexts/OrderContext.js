import React, { createContext, useContext, useState, useEffect } from 'react';
import storageService from '../services/storageService';
import { ordersAPI } from '../services/api';
import { useAuth } from './AuthContext';

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const loadedOrders = await ordersAPI.getMyOrders(user?.id);
      setOrders(loadedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createOrder = async (orderData) => {
    try {
      const response = await ordersAPI.create({
        ...orderData,
        userId: user?.id,
        userName: `${user?.firstName} ${user?.lastName}`,
        userPhone: user?.phone
      });
      
      if (response.success) {
        const newOrders = [...orders, response.order];
        setOrders(newOrders);
        await storageService.saveOrders(newOrders);
        return { success: true, order: response.order };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error };
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await ordersAPI.updateStatus(orderId, status);
      
      if (response.success) {
        const updatedOrders = orders.map(order =>
          order.id === orderId ? { ...order, status } : order
        );
        setOrders(updatedOrders);
        await storageService.saveOrders(updatedOrders);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  };

  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status);
  };

  const value = {
    orders,
    isLoading,
    createOrder,
    updateOrderStatus,
    getOrdersByStatus,
    refreshOrders: loadOrders
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};
