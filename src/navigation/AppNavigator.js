import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Screens
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { RegistrationScreen } from '../screens/RegistrationScreen';
import { SmsAuthScreen } from '../screens/SmsAuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CreateOrderScreen } from '../screens/CreateOrderScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Main Tab Navigator
 * Нижняя табулята навигация: Home, Orders, Profile
 */
const MainTabs = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#32B8C6',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('navigation.home') }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: t('navigation.orders') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('navigation.profile') }}
      />
    </Tab.Navigator>
  );
};

/**
 * Auth Stack Navigator
 * Экраны авторизации: Welcome, Registration, SmsAuth, Onboarding
 */
export const AuthNavigator = ({ isOnboarding = false, onOnboardingComplete = null }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
      // Если это первый запуск (онбординг) — начинаем с Onboarding
      initialRouteName={isOnboarding ? 'Onboarding' : 'Welcome'}
    >
      {/* ОНБОРДИНГ — показывается только при первом запуске */}
      {isOnboarding && (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            headerShown: false,
            animationEnabled: false,
          }}
          listeners={({ navigation }) => ({
            beforeRemove: (e) => {
              // Передаём callback при завершении онбординга
              if (onOnboardingComplete) {
                onOnboardingComplete();
              }
            },
          })}
        />
      )}

      {/* АВТОРИЗАЦИЯ */}
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="Registration"
        component={RegistrationScreen}
        options={{
          headerShown: true,
          title: 'Регистрация',
          headerBackTitleVisible: false,
        }}
      />

      <Stack.Screen
        name="SmsAuth"
        component={SmsAuthScreen}
        options={{
          headerShown: true,
          title: 'Подтверждение',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

/**
 * Main Stack Navigator
 * Главное приложение после авторизации
 */
export const MainNavigator = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}
    >
      {/* Табулята навигация: Home, Orders, Profile */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          headerShown: false,
        }}
      />

      {/* Экран создания заказа */}
      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{
          title: t('screens.createOrder') || 'Создать заказ',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};
