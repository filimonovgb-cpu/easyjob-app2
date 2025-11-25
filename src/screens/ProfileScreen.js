import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getCategoryById } from '../constants/categories';

export const ProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, role, logout } = useAuth();

  const category = getCategoryById(user?.categoryId);

  const handleLogout = () => {
    Alert.alert(t('logout'), t('confirmLogout'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          });
        },
      },
    ]);
  };

  const menuItems = [
    { icon: 'person-outline', label: t('editProfile'), onPress: () => {} },
    { icon: 'card-outline', label: t('paymentMethods'), onPress: () => {} },
    { icon: 'notifications-outline', label: t('notifications'), onPress: () => {} },
    { icon: 'help-circle-outline', label: t('help'), onPress: () => {} },
    { icon: 'settings-outline', label: t('settings'), onPress: () => {} },
    {
      icon: 'log-out-outline',
      label: t('logout'),
      onPress: handleLogout,
      danger: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={{ uri: user?.photo }} style={styles.photo} />
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.role}>
            {role === 'client' ? t('client') : t('executor')}
          </Text>
          {category && (
            <View style={styles.categoryBadge}>
              <Ionicons name={category.icon} size={16} color={category.color} />
              <Text style={styles.categoryText}>{t(category.name)}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{user?.phone}</Text>
          </View>
          {role === 'executor' && (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={styles.infoText}>
                  {user?.rating || '5.0'} ({user?.reviews || '0'} {t('reviews')})
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={20} color="#666" />
                <Text style={styles.infoText}>
                  {user?.experience || '0'} {t('yearsExperience')}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={item.danger ? '#ff4444' : '#666'}
              />
              <Text
                style={[styles.menuText, item.danger && styles.menuTextDanger]}
              >
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  menu: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  menuTextDanger: {
    color: '#ff4444',
  },
});
