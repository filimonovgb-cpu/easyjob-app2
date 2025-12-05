import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useOffersForOrder } from '../hooks/useOffers';
import offerService from '../services/offerService';

export default function ClientOrderOffersScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { offers, loading, error, refresh } = useOffersForOrder(orderId);

  const [processing, setProcessing] = useState(null);
  const [selected, setSelected] = useState(null);

  const sendPushNotification = async (token, title, body) => {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: token, title, body }),
      });
    } catch {}
  };

  const confirmExecutor = async (offer) => {
    try {
      setProcessing(offer.id);
      await offerService.chooseExecutor(offer.id);

      if (offer.contractorPushToken) {
        await sendPushNotification(
          offer.contractorPushToken,
          'Вас выбрали исполнителем',
          `Заказ №${orderId}`
        );
      }

      Alert.alert('Успех', 'Исполнитель выбран!');
      refresh();
    } catch {
      Alert.alert('Ошибка', 'Не удалось выбрать исполнителя');
    } finally {
      setProcessing(null);
    }
  };

  const confirmPayment = async (offer) => {
    Alert.alert(
      'Подтверждение оплаты',
      'Подтвердите списание 15 ₽ за выбор исполнителя',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Оплатить 15 ₽',
          onPress: async () => {
            try {
              setProcessing(offer.id);
              await offerService.confirmOrderPayment(offer.id);
              Alert.alert('Готово', 'Оплата подтверждена');
            } catch {
              Alert.alert('Ошибка', 'Не удалось выполнить оплату');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#32B8C6" />
        <Text>Загружаем предложения...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>Ошибка загрузки предложений</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Офферы по заказу #{orderId}</Text>

      {offers.length === 0 ? (
        <Text style={styles.empty}>Пока нет офферов</Text>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selected === item.id;

            return (
              <View style={[styles.card, isSelected && styles.selected]}>
                <Text style={styles.label}>Исполнитель:</Text>
                <Text style={styles.value}>{item.contractorName}</Text>

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('ProfessionalDetail', {
                      professionalId: item.contractorId,
                    })
                  }
                >
                  <Text style={styles.link}>Открыть профиль →</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Цена:</Text>
                <Text style={styles.value}>{item.offerPrice} ₽</Text>

                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => setSelected(item.id)}
                >
                  <Text style={styles.btnText}>Выбрать</Text>
                </TouchableOpacity>

                {isSelected && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[
                        styles.acceptBtn,
                        processing === item.id && styles.disabled,
                      ]}
                      onPress={() => confirmExecutor(item)}
                      disabled={processing === item.id}
                    >
                      <Text style={styles.btnText}>Подтвердить исполнителя</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.payBtn,
                        processing === item.id && styles.disabled,
                      ]}
                      onPress={() => confirmPayment(item)}
                      disabled={processing === item.id}
                    >
                      <Text style={styles.btnText}>Оплатить 15 ₽</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 16 },
  empty: { marginTop: 20, textAlign: 'center', color: '#777' },
  card: {
    backgroundColor: '#f4f4f4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  selected: { borderWidth: 2, borderColor: '#32B8C6' },
  label: { fontWeight: '700', marginBottom: 4 },
  value: { marginBottom: 10 },
  link: { color: '#32B8C6', marginBottom: 12, fontWeight: '600' },
  selectBtn: {
    backgroundColor: '#32B8C6',
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  actionRow: { marginTop: 12 },
  acceptBtn: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  payBtn: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
  },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
