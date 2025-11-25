import React, { createContext, useContext, useState, useEffect } from 'react';
import storageService from '../services/storageService';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await storageService.getUserData();
      const userRole = await storageService.getUserRole();
      
      if (userData && userRole) {
        setUser(userData);
        setRole(userRole);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading user ', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData, userRole) => {
    try {
      await storageService.saveUserData(userData);
      await storageService.saveUserRole(userRole);
      setUser(userData);
      setRole(userRole);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  };

  const register = async (userData, userRole) => {
    try {
      const response = await authAPI.register(userData);
      if (response.success) {
        return login(response.user, userRole);
      }
      return false;
    } catch (error) {
      console.error('Error registering:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await storageService.clearUserData();
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
      return true;
    } catch (error) {
      console.error('Error logging out:', error);
      return false;
    }
  };

  const updateUser = async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      await storageService.saveUserData(updatedUser);
      setUser(updatedUser);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };

  const value = {
    user,
    role,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
