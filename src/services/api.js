import axios from 'axios';
import storageService from './storageService';

const API_BASE_URL = 'https://api.easyjob.ru'; // Замените на ваш API

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await storageService.getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storageService.clearUserData();
      // Redirect to login
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  sendSms: async (phone) => {
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, code: '123456' });
      }, 1000);
    });
  },
  
  verifySms: async (phone, code) => {
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        if (code === '123456') {
          resolve({ 
            success: true, 
            token: 'mock_token_' + Date.now(),
            user: { phone }
          });
        } else {
          resolve({ success: false, error: 'errorInvalidSms' });
        }
      }, 1000);
    });
  },
  
  register: async (userData) => {
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ 
          success: true, 
          user: { ...userData, id: 'user_' + Date.now() }
        });
      }, 1000);
    });
  }
};

// Professionals API
export const professionalsAPI = {
  getAll: async () => {
    // Mock data
    return Promise.resolve(MOCK_PROFESSIONALS);
  },
  
  getNearby: async (latitude, longitude, radius = 10, categoryId = null) => {
    // Mock implementation with filtering
    let professionals = [...MOCK_PROFESSIONALS];
    
    if (categoryId) {
      professionals = professionals.filter(p => p.categoryId === categoryId);
    }
    
    return Promise.resolve(professionals);
  },
  
  getById: async (id) => {
    const professional = MOCK_PROFESSIONALS.find(p => p.id === id);
    return Promise.resolve(professional);
  }
};

// Orders API
export const ordersAPI = {
  create: async (orderData) => {
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ 
          success: true, 
          order: { 
            ...orderData, 
            id: 'order_' + Date.now(),
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        });
      }, 1000);
    });
  },
  
  getMyOrders: async (userId) => {
    // Load from storage
    const orders = await storageService.getOrders() || [];
    return Promise.resolve(orders);
  },
  
  updateStatus: async (orderId, status) => {
    return Promise.resolve({ success: true, orderId, status });
  }
};

// Mock data
const MOCK_PROFESSIONALS = [
  {
    id: '1',
    firstName: 'Иван',
    lastName: 'Петров',
    categoryId: '1',
    rating: 4.8,
    reviews: 127,
    pricePerHour: 1500,
    experience: 5,
    photo: 'https://i.pravatar.cc/150?img=1',
    latitude: 55.7558,
    longitude: 37.6173,
    distance: 1.2
  },
  {
    id: '2',
    firstName: 'Мария',
    lastName: 'Сидорова',
    categoryId: '3',
    rating: 4.9,
    reviews: 203,
    pricePerHour: 1200,
    experience: 7,
    photo: 'https://i.pravatar.cc/150?img=5',
    latitude: 55.7539,
    longitude: 37.6208,
    distance: 0.8
  },
  {
    id: '3',
    firstName: 'Алексей',
    lastName: 'Смирнов',
    categoryId: '2',
    rating: 4.7,
    reviews: 89,
    pricePerHour: 2000,
    experience: 4,
    photo: 'https://i.pravatar.cc/150?img=3',
    latitude: 55.7601,
    longitude: 37.6189,
    distance: 1.5
  }
];

export default api;
