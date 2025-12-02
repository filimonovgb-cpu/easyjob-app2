import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { OrderProvider } from './src/contexts/OrderContext';
import { PaymentProvider } from './src/contexts/PaymentContext';
import { DealProvider } from './src/contexts/DealContext';

import { AuthNavigator, MainNavigator } from './src/navigation/AppNavigator';

import './i18n';

// Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Root Navigator
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

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

  if (isLoading || onboardingLoading) {
    return null; // здесь можно отрендерить SplashScreen
  }

  if (hasSeenOnboarding === false) {
    return (
      <NavigationContainer>
        <AuthNavigator
          isOnboarding={true}
          onOnboardingComplete={() => setHasSeenOnboarding(true)}
        />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// Main App
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OrderProvider>
            <PaymentProvider>
              <DealProvider>
                <RootNavigator />
              </DealProvider>
            </PaymentProvider>
          </OrderProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
