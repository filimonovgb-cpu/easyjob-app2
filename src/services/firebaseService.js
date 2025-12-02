// src/services/firebaseService.js

/**
 * Firebase Service
 * Центральный сервис для работы с Firestore
 * Инициализация, CRUD операции, запросы
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  writeBatch,
  increment,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase конфиг
const firebaseConfig = {
  apiKey: 'AIzaSyBngIebPrWRLZxGf_otcVDD_ReSnyFxxLU',
  authDomain: 'easy-job-dab45.firebaseapp.com',
  projectId: 'easy-job-dab45',
  storageBucket: 'easy-job-dab45.firebasestorage.app',
  messagingSenderId: '737026294842',
  appId: '1:737026294842:web:784c4061f436981ca1e103',
  measurementId: 'G-3WCW2VS2Z3',
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * ========== AUTH METHODS ==========
 */

export const authService = {
  register: async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true, user: user.uid };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  },

  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user.uid };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  },

  getCurrentUser: () => {
    return auth.currentUser;
  },

  onAuthStateChange: (callback) => {
    return onAuthStateChanged(auth, callback);
  },
};

/**
 * ========== USER METHODS ==========
 */

export const userService = {
  getUserProfile: async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      }
      return { success: false, error: 'User not found' };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message };
    }
  },

  updateUserProfile: async (userId, updates) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  },

  getUserBalance: async (userId) => {
    try {
      const walletDoc = await getDoc(doc(db, 'users', userId, 'wallet', 'main'));
      if (walletDoc.exists()) {
        return { success: true, data: walletDoc.data() };
      }

      const newWallet = {
        balance: 0,
        frozen: { total: 0, byDeal: {} },
        transactionHistory: [],
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', userId, 'wallet', 'main'), newWallet);
      return { success: true, data: newWallet };
    } catch (error) {
      console.error('Error getting balance:', error);
      return { success: false, error: error.message };
    }
  },

  getUsersByType: async (userType, limitCount = 100) => {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', userType),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, users };
    } catch (error) {
      console.error('Error getting users by type:', error);
      return { success: false, error: error.message };
    }
  },
};

/**
 * ========== ORDER METHODS ==========
 */

export const orderService = {
  createOrder: async (clientId, orderData) => {
    try {
      const orderId = `order_${Date.now()}`;
      const orderRef = doc(db, 'orders', orderId);

      await setDoc(orderRef, {
        id: orderId,
        clientId,
        title: orderData.title,
        description: orderData.description,
        categoryId: orderData.categoryId,
        budget: orderData.budget,
        latitude: orderData.latitude,
        longitude: orderData.longitude,
        address: orderData.address,
        executionTime: orderData.executionTime,
        duration: orderData.duration,
        status: 'created',
        topContractors: [],
        responseDeadline: new Date(Date.now() + 30 * 60 * 1000),
        responsesLimit: 10,
        responsesCount: 0,
        selectedContractorId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true, orderId };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: error.message };
    }
  },

  getOrder: async (orderId) => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        return { success: true, data: orderDoc.data() };
      }
      return { success: false, error: 'Order not found' };
    } catch (error) {
      console.error('Error getting order:', error);
      return { success: false, error: error.message };
    }
  },

  getClientOrders: async (clientId) => {
    try {
      const q = query(
        collection(db, 'orders'),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, orders };
    } catch (error) {
      console.error('Error getting client orders:', error);
      return { success: false, error: error.message };
    }
  },

  getActiveOrdersNearby: async (latitude, longitude, radiusKm = 5) => {
    try {
      const q = query(
        collection(db, 'orders'),
        where('status', '==', 'created'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const orders = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((order) => {
          const distance = calculateDistance(
            latitude,
            longitude,
            order.latitude,
            order.longitude
          );
          return distance <= radiusKm;
        });
      return { success: true, orders };
    } catch (error) {
      console.error('Error getting orders nearby:', error);
      return { success: false, error: error.message };
    }
  },

  updateOrder: async (orderId, updates) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating order:', error);
      return { success: false, error: error.message };
    }
  },

  setTopContractors: async (orderId, contractorIds) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        topContractors: contractorIds,
      });
      return { success: true };
    } catch (error) {
      console.error('Error setting top contractors:', error);
      return { success: false, error: error.message };
    }
  },
};

/**
 * ========== RESPONSE METHODS ==========
 */

export const responseService = {
  createResponse: async (orderId, contractorId, proposedPrice, message = '') => {
    try {
      const responseId = `response_${Date.now()}`;
      const responseRef = doc(db, 'responses', responseId);

      await setDoc(responseRef, {
        id: responseId,
        orderId,
        contractorId,
        proposedPrice,
        message,
        status: 'sent',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'orders', orderId), {
        responsesCount: increment(1),
      });

      return { success: true, responseId };
    } catch (error) {
      console.error('Error creating response:', error);
      return { success: false, error: error.message };
    }
  },

  getOrderResponses: async (orderId) => {
    try {
      const q = query(
        collection(db, 'responses'),
        where('orderId', '==', orderId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const responses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, responses };
    } catch (error) {
      console.error('Error getting responses:', error);
      return { success: false, error: error.message };
    }
  },

  getContractorResponses: async (contractorId) => {
    try {
      const q = query(
        collection(db, 'responses'),
        where('contractorId', '==', contractorId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const responses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, responses };
    } catch (error) {
      console.error('Error getting contractor responses:', error);
      return { success: false, error: error.message };
    }
  },

  updateResponseStatus: async (responseId, status) => {
    try {
      await updateDoc(doc(db, 'responses', responseId), {
        status,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating response status:', error);
      return { success: false, error: error.message };
    }
  },
};

/**
 * ========== DEAL METHODS ==========
 */

export const dealService = {
  createDeal: async (orderId, clientId, contractorId, agreedPrice, executionTime) => {
    try {
      const dealId = `deal_${Date.now()}`;
      const dealRef = doc(db, 'deals', dealId);

      const cancellationDeadline = new Date(executionTime.getTime() - 45 * 60 * 1000);

      await setDoc(dealRef, {
        id: dealId,
        orderId,
        clientId,
        contractorId,
        agreedPrice,
        commission: {
          client: 15,
          contractor: 0,
        },
        executionTime,
        cancellationDeadline,
        clientContactsUnlocked: false,
        contractorContactsUnlocked: false,
        status: 'accepted',
        cancellation: {
          reason: null,
          cancelledBy: null,
          cancelledAt: null,
          penalty: {
            applied: false,
            amount: 0,
            reason: null,
          },
        },
        payments: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true, dealId };
    } catch (error) {
      console.error('Error creating deal:', error);
      return { success: false, error: error.message };
    }
  },

  getDeal: async (dealId) => {
    try {
      const dealDoc = await getDoc(doc(db, 'deals', dealId));
      if (dealDoc.exists()) {
        return { success: true, data: dealDoc.data() };
      }
      return { success: false, error: 'Deal not found' };
    } catch (error) {
      console.error('Error getting deal:', error);
      return { success: false, error: error.message };
    }
  },

  getClientDeals: async (clientId) => {
    try {
      const q = query(
        collection(db, 'deals'),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const deals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, deals };
    } catch (error) {
      console.error('Error getting client deals:', error);
      return { success: false, error: error.message };
    }
  },

  getContractorDeals: async (contractorId) => {
    try {
      const q = query(
        collection(db, 'deals'),
        where('contractorId', '==', contractorId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const deals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, deals };
    } catch (error) {
      console.error('Error getting contractor deals:', error);
      return { success: false, error: error.message };
    }
  },

  updateDealStatus: async (dealId, status) => {
    try {
      await updateDoc(doc(db, 'deals', dealId), {
        status,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating deal status:', error);
      return { success: false, error: error.message };
    }
  },

  unlockClientContacts: async (dealId) => {
    try {
      await updateDoc(doc(db, 'deals', dealId), {
        clientContactsUnlocked: true,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error unlocking client contacts:', error);
      return { success: false, error: error.message };
    }
  },

  unlockContractorContacts: async (dealId) => {
    try {
      await updateDoc(doc(db, 'deals', dealId), {
        contractorContactsUnlocked: true,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error unlocking contractor contacts:', error);
      return { success: false, error: error.message };
    }
  },
};

/**
 * ========== PAYMENT METHODS ==========
 */

export const paymentService = {
  createPayment: async (dealId, userId, type, amount) => {
    try {
      const paymentId = `payment_${Date.now()}`;
      const paymentRef = doc(db, 'payments', paymentId);

      await setDoc(paymentRef, {
        id: paymentId,
        dealId,
        userId,
        type,
        amount,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      return { success: true, paymentId };
    } catch (error) {
      console.error('Error creating payment:', error);
      return { success: false, error: error.message };
    }
  },

  getDealPayments: async (dealId) => {
    try {
      const q = query(collection(db, 'payments'), where('dealId', '==', dealId));
      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, payments };
    } catch (error) {
      console.error('Error getting deal payments:', error);
      return { success: false, error: error.message };
    }
  },

  updatePaymentStatus: async (paymentId, status) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error: error.message };
    }
  },
};

/**
 * ========== TRANSACTION METHODS ==========
 */

export const transactionService = {
  recordTransaction: async (userId, type, amount, relatedDealId, description) => {
    try {
      const transactionId = `transaction_${Date.now()}`;
      const transactionRef = doc(db, 'transactions', transactionId);

      await setDoc(transactionRef, {
        id: transactionId,
        userId,
        type,
        amount,
        dealId: relatedDealId,
        description,
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      return { success: true, transactionId };
    } catch (error) {
      console.error('Error recording transaction:', error);
      return { success: false, error: error.message };
    }
  },

  getUserTransactions: async (userId, limitCount = 50) => {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, transactions };
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return { success: false, error: error.message };
    }
  },
};

/**
 * ========== UTILITY FUNCTIONS ==========
 */

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export { db, auth, storage };

export default {
  authService,
  userService,
  orderService,
  responseService,
  dealService,
  paymentService,
  transactionService,
};
