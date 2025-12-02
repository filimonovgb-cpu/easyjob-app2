import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_DATA: '@user_data',
  USER_ROLE: '@user_role',
  AUTH_TOKEN: '@auth_token',
  ORDERS: '@orders',
  PROFESSIONALS: '@professionals',
};

class StorageService {
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error('Error saving ', error);
      return false;
    }
  }

  async getItem(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error loading ', error);
      return null;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing ', error);
      return false;
    }
  }

  async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing ', error);
      return false;
    }
  }

  // Specific methods
  async saveUserData(userData) {
    return this.setItem(KEYS.USER_DATA, userData);
  }

  async getUserData() {
    return this.getItem(KEYS.USER_DATA);
  }

  async saveUserRole(role) {
    return this.setItem(KEYS.USER_ROLE, role);
  }

  async getUserRole() {
    return this.getItem(KEYS.USER_ROLE);
  }

  async saveAuthToken(token) {
    return this.setItem(KEYS.AUTH_TOKEN, token);
  }

  async getAuthToken() {
    return this.getItem(KEYS.AUTH_TOKEN);
  }

  async saveOrders(orders) {
    return this.setItem(KEYS.ORDERS, orders);
  }

  async getOrders() {
    return this.getItem(KEYS.ORDERS);
  }

  async clearUserData() {
    await this.removeItem(KEYS.USER_DATA);
    await this.removeItem(KEYS.USER_ROLE);
    await this.removeItem(KEYS.AUTH_TOKEN);
  }
}

export default new StorageService();
