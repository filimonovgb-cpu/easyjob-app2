import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useOffersForContractor } from '../hooks/useOffers';
import offerService from '../services/offerService';

export default function ContractorOffersScreen({ route, navigation }) {
  const { contractorId } = route.params;
  const { offers, loading, error, refresh } = useOffersForContractor(contractorId);

  const [price, setPrice] = useState({});
  const [processing, setProcessing] = useState(null);

  const sendPushNotification = async (token, title, body) => {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: token, title, body }),
      });
    } catch {}
  };

  const handleAccept = async (offer) => {
    const customPrice = Number(price[offer.id]);

    if (!customPrice || customPrice < 100) {
      return Alert.alert('Ошибка', 'Введите корректную цену (от 100 ₽)');
    }

    try {
      setProcessing(offer.id);
      await offerService.acceptOffer(offer.id, customPrice);

      if (offer.clientPushToken) {
        await sendPushNotification(
          offer.clientPushToken,
          'Исполнитель принял предложение',
          `Новая цена: ${customPrice} ₽`
        );
      }

      refresh();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось принять предложение');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (offer) => {
    try {
      setProcessing(offer.id);
      await offerService.declineOffer(offer.id);

      if (offer.clientPushToken) {
        await sendPushNotification(
          offer.clientPushToken,
          'Исполнитель отклонил предложение',
          `По заказу #${offer.orderId}`
        );
      }

      refresh();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось отклонить предложение');
    } finally {
      setProcessing(null);
    }
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
      <Text style={styles.title}>Входящие офферы</Text>

      {offers.length === 0 ? (
        <Text style={styles.empty}>Пока нет новых предложений</Text>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.label}>Заказ №{item.orderId}</Text>
              <Text style={styles.value}>{item.orderDescription}</Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('OrderDetail', { orderId: item.orderId })
                }
              >
                <Text style={styles.link}>Открыть заказ →</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Ваша цена (₽):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Введите цену"
                value={price[item.id] || ''}
                onChangeText={(v) => setPrice((p) => ({ ...p, [item.id]: v }))}
              />

              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.acceptBtn,
                    processing === item.id && styles.disabled,
                  ]}
                  onPress={() => handleAccept(item)}
                  disabled={processing === item.id}
                >
                  <Text style={styles.btnText}>Принять</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.declineBtn,
                    processing === item.id && styles.disabled,
                  ]}
                  onPress={() => handleDecline(item)}
                  disabled={processing === item.id}
                >
                  <Text style={styles.btnText}>Отклонить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  label: { fontWeight: '700', marginBottom: 4 },
  value: { marginBottom: 12 },
  link: { color: '#32B8C6', marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  acceptBtn: {
    backgroundColor: '#4CAF50',
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginRight: 6,
  },
  declineBtn: {
    backgroundColor: '#E53935',
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginLeft: 6,
  },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
