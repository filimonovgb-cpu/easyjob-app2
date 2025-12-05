// src/screens/ProfessionalDetailScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { offerService } from '../services/offerService';
import { useAuth } from '../contexts/AuthContext';

export const ProfessionalDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();

  const { professional, orderId, orderStatus } = route.params || {};
  const [loading, setLoading] = useState(false);

  if (!professional) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Профиль специалиста</Text>
        <Text style={styles.text}>Данные специалиста не переданы.</Text>
      </View>
    );
  }

  const isClient = user?.role === 'client';
  const isContractor = user?.role === 'contractor';

  const sendOffer = () => {
    Alert.alert('Отправить оффер', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Да',
        onPress: async () => {
          try {
            setLoading(true);
            await offerService.sendOffer(orderId, professional.id);
            Alert.alert('Оффер отправлен!');
            navigation.goBack();
          } catch (e) {
            console.log('sendOffer error:', e);
            Alert.alert('Ошибка', 'Не удалось отправить оффер.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const selectProfessional = () => {
    Alert.alert('Подтвердить исполнителя', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Да',
        onPress: async () => {
          try {
            setLoading(true);
            await offerService.selectProfessional(orderId, professional.id);

            Alert.alert('Исполнитель выбран');
            navigation.navigate('OrderDetail', {
              orderId,
              refresh: Date.now(),
            });
          } catch (e) {
            console.log('selectProfessional error:', e);
            Alert.alert('Ошибка', 'Не удалось выбрать исполнителя.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        {professional.photo ? (
          <Image source={{ uri: professional.photo }} style={styles.avatar} />
        ) : null}
        <View style={styles.headerInfo}>
          <Text style={styles.name}>
            {professional.firstName} {professional.lastName}
          </Text>
          <Text style={styles.subtitle}>
            {professional.categoryName || 'Категория не указана'}
          </Text>
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Рейтинг</Text>
        <Text style={styles.text}>
          {professional.rating || '-'} ({professional.reviews || 0} отзывов)
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Цена за час</Text>
        <Text style={styles.text}>
          {professional.pricePerHour
            ? `${professional.pricePerHour} ₽/час`
            : '-'}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Опыт</Text>
        <Text style={styles.text}>
          {professional.experience
            ? `${professional.experience} лет`
            : 'Не указан'}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Локация</Text>
        <Text style={styles.text}>
          {professional.latitude && professional.longitude
            ? `${professional.latitude}, ${professional.longitude}`
            : 'Не указана'}
        </Text>
      </View>

      {/* ==== ДЕЙСТВИЯ ==== */}

      {/* Исполнитель → отправить оффер клиенту */}
      {isContractor && orderId && (
        <TouchableOpacity
          style={styles.buttonPrimary}
          disabled={loading}
          onPress={sendOffer}
        >
          <Text style={styles.buttonText}>Отправить оффер</Text>
        </TouchableOpacity>
      )}

      {/* Клиент → выбрать исполнителя */}
      {isClient && orderId && orderStatus === 'searching' && (
        <TouchableOpacity
          style={styles.buttonSuccess}
          disabled={loading}
          onPress={selectProfessional}
        >
          <Text style={styles.buttonText}>Выбрать исполнителя</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 16,
  },
  headerInfo: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  block: {
    marginBottom: 16,
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  buttonPrimary: {
    marginTop: 30,
    padding: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSuccess: {
    marginTop: 30,
    padding: 16,
    backgroundColor: COLORS.green || '#2ecc71',
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
