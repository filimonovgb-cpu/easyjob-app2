import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Core screens
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { RegistrationScreen } from '../screens/RegistrationScreen';
import { SmsAuthScreen } from '../screens/SmsAuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CreateOrderScreen } from '../screens/CreateOrderScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { ProfessionalDetailScreen } from '../screens/ProfessionalDetailScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';

// NEW (Offers Module)
import ClientOrderOffersScreen from '../screens/Offers/ClientOrderOffersScreen';
import ContractorOffersScreen from '../screens/Offers/ContractorOffersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * TAB NAVIGATOR (Home / Orders / Profile)
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
 * AUTH NAVIGATOR
 */
export const AuthNavigator = ({ isOnboarding = false, onOnboardingComplete = null }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
      initialRouteName={isOnboarding ? 'Onboarding' : 'Welcome'}
    >
      {isOnboarding && (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            headerShown: false,
            animationEnabled: false,
          }}
          listeners={() => ({
            beforeRemove: () => {
              if (onOnboardingComplete) {
                onOnboardingComplete();
              }
            },
          })}
        />
      )}

      <Stack.Screen name="Welcome" component={WelcomeScreen} />

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
 * MAIN NAVIGATOR
 * (основная часть приложения)
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
      {/* Tabs (Home, Orders, Profile) */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />

      {/* Order creation */}
      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{
          title: t('screens.createOrder') || 'Создать заказ',
        }}
      />

      {/* Order detail */}
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{
          title: t('screens.orderDetail') || 'Детали заказа',
        }}
      />

      {/* Professional detail */}
      <Stack.Screen
        name="ProfessionalDetail"
        component={ProfessionalDetailScreen}
        options={{
          title: t('screens.professionalDetail') || 'Профиль специалиста',
        }}
      />

      {/* --- NEW OFFERS SCREENS --- */}

      <Stack.Screen
        name="ClientOrderOffers"
        component={ClientOrderOffersScreen}
        options={{
          title: 'Предложения по заказу',
        }}
      />

      <Stack.Screen
        name="ContractorOffers"
        component={ContractorOffersScreen}
        options={{
          title: 'Ваши заявки',
        }}
      />
    </Stack.Navigator>
  );
};
