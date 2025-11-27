import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { OrderProvider } from './src/contexts/OrderContext';
import { PaymentProvider } from './src/contexts/PaymentContext'; // ← ДОБАВИЛИ
import { AuthNavigator, MainNavigator } from './src/navigation/AppNavigator';
import './i18n';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/**
 * Root Navigator Component
 * Определяет, какой навигатор показать:
 * - Онбординг (первый запуск)
 * - Авторизация (не залогинен)
 * - Главное приложение (залогинен)
 */
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  /**
   * При старте приложения проверяем:
   * 1. Был ли пройден онбординг
   * 2. Залогинен ли пользователь
   */
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(seen === 'true');
      } catch (error) {
        console.error('Ошибка при проверке онбординга:', error);
        setHasSeenOnboarding(false);
      } finally {
        setOnboardingLoading(false);
      }
    };

    checkOnboarding();
  }, []);

  // Загруженияются данные авторизации и онбординга
  if (isLoading || onboardingLoading) {
    return null; // Или можно показать SplashScreen
  }

  // Если онбординг не был пройден — показываем его первым
  if (hasSeenOnboarding === false) {
    return (
      <NavigationContainer>
        <AuthNavigator isOnboarding={true} onOnboardingComplete={() => setHasSeenOnboarding(true)} />
      </NavigationContainer>
    );
  }

  // Если прошёл онбординг, проверяем авторизацию
  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

/**
 * Main App Component
 * Основной компонент приложения со всеми провайдерами
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OrderProvider>
            <PaymentProvider>              {/* ← ДОБАВИЛИ СЮДА */}
              <RootNavigator />
            </PaymentProvider>             {/* ← ЗАКРЫЛИ СЮДА */}
          </OrderProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
