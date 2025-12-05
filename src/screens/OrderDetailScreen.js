import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getOrderById } from '../services/orderService';
import { COLORS } from '../constants/colors';

export default function OrderDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();

  const { orderId } = route.params;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---- Загрузка заказа ----
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.log('OrderDetail error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Auto Refresh при возвращении на экран ----
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>{t('orders.orderNotFound')}</Text>
      </View>
    );
  }

  const hasExecutor =
    order.executorId && order.executorName && order.executorPrice;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('orders.orderDetails')}</Text>

      {/* Блок основной информации */}
      <View style={styles.block}>
        <Text style={styles.label}>{t('orders.category')}</Text>
        <Text style={styles.value}>{order.category}</Text>

        <Text style={styles.label}>{t('orders.description')}</Text>
        <Text style={styles.value}>{order.description}</Text>

        <Text style={styles.label}>{t('orders.price')}</Text>
        <Text style={styles.value}>{order.price} ₽</Text>

        <Text style={styles.label}>{t('orders.status')}</Text>
        <Text style={styles.status}>{translateStatus(order.status)}</Text>
      </View>

      {/* Если исполнитель уже выбран */}
      {hasExecutor && (
        <View style={styles.executorBlock}>
          <Text style={styles.executorTitle}>Выбранный исполнитель</Text>

          <Text style={styles.label}>Имя</Text>
          <Text style={styles.value}>{order.executorName}</Text>

          <Text style={styles.label}>Цена</Text>
          <Text style={styles.value}>{order.executorPrice} ₽</Text>

          <Text style={styles.label}>Телефон</Text>
          <Text style={styles.value}>{order.executorPhone}</Text>

          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() =>
              navigation.navigate('ProfessionalDetail', {
                professionalId: order.executorId,
              })
            }
          >
            <Text style={styles.profileBtnText}>Открыть профиль →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Кнопка перехода к офферам */}
      {(order.status === 'searching' ||
        order.status === 'waiting_confirmation') && (
        <TouchableOpacity
          style={styles.offersButton}
          onPress={() =>
            navigation.navigate('ClientOrderOffers', { orderId: order.id })
          }
        >
          <Text style={styles.offersButtonText}>Посмотреть офферы</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ---- Перевод статусов ----
function translateStatus(status) {
  switch (status) {
    case 'searching':
      return 'Поиск исполнителей…';
    case 'waiting_confirmation':
      return 'Получены предложения';
    case 'executor_selected':
      return 'Исполнитель выбран';
    case 'completed':
      return 'Выполнено';
    case 'canceled':
      return 'Отменено';
    default:
      return status;
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  block: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 6,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  status: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  offersButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  offersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  executorBlock: {
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  executorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  profileBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  profileBtnText: {
    color: '#fff',
    fontSize: 15,
  },
});
