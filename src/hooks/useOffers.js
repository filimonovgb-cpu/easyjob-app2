// src/hooks/useOffers.js
import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../services/firebaseService';

/**
 * Hook: подписывается на офферы конкретного заказа (для клиента)
 * Возвращает { offers, loading, error }
 */
export const useOffersForOrder = (orderId) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) {
      setOffers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'offers'),
      where('orderId', '==', orderId),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const arr = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOffers(arr);
        setLoading(false);
      },
      (err) => {
        console.warn('offers onSnapshot error', err);
        setError(err.message || String(err));
        setLoading(false);
      }
    );

    return () => unsub();
  }, [orderId]);

  return { offers, loading, error };
};

/**
 * Hook: подписывается на офферы, адресованные конкретному исполнителю
 * (для исполнителя: смотреть входящие предложения)
 */
export const useOffersForContractor = (contractorId) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contractorId) {
      setOffers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'offers'),
      where('contractorId', '==', contractorId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const arr = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOffers(arr);
        setLoading(false);
      },
      (err) => {
        console.warn('offers (contractor) onSnapshot error', err);
        setError(err.message || String(err));
        setLoading(false);
      }
    );

    return () => unsub();
  }, [contractorId]);

  return { offers, loading, error };
};


// -------------------------
// Примеры использования в экране (копировать в компонент экрана)
// -------------------------

/*
// Пример: клиентский экран - показываем принятые офферы
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useOffersForOrder } from '../hooks/useOffers';
import { offerService } from '../services/offerService';
import { useAuth } from '../contexts/AuthContext';

export const ClientOffersScreen = ({ route }) => {
  const { orderId } = route.params;
  const { offers, loading } = useOffersForOrder(orderId);
  const { user } = useAuth();

  const accepted = offers.filter(o => o.status === 'accepted');

  const onChoose = async (offer) => {
    try {
      const res = await offerService.chooseOffer(offer.id, user.id);
      if (!res.success) {
        Alert.alert('Ошибка', res.error || 'Не удалось выбрать оффер');
        return;
      }
      // теперь у нас есть dealId -> далее вызов оплаты через PaymentContext
      Alert.alert('Выбран', 'Создана сделка: ' + res.dealId);
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка', e.message);
    }
  };

  if (loading) return <Text>Загрузка...</Text>;
  if (!accepted.length) return <Text>Никто ещё не принял заказ</Text>;

  return (
    <FlatList
      data={accepted}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text>Исполнитель: {item.contractorId}</Text>
          <Text>Цена: {item.proposedPrice || '-'} ₽</Text>
          <TouchableOpacity onPress={() => onChoose(item)}>
            <Text style={{ color: '#32B8C6', marginTop: 8 }}>Выбрать</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
};
*/

/*
// Пример: экран исполнителя - список входящих офферов
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useOffersForContractor } from '../hooks/useOffers';
import { offerService } from '../services/offerService';
import { useAuth } from '../contexts/AuthContext';

export const ContractorIncomingScreen = () => {
  const { user } = useAuth();
  const { offers, loading } = useOffersForContractor(user.id);

  const onAccept = async (offerId, price) => {
    const res = await offerService.acceptOffer(offerId, user.id, price);
    if (!res.success) {
      Alert.alert('Ошибка', res.error || 'Не удалось принять');
    } else {
      Alert.alert('Принято', 'Ожидайте решения клиента');
    }
  };

  const onDecline = async (offerId) => {
    const res = await offerService.declineOffer(offerId, user.id);
    if (!res.success) {
      Alert.alert('Ошибка', res.error || 'Не удалось отклонить');
    } else {
      Alert.alert('Отклонено');
    }
  };

  if (loading) return <Text>Загрузка...</Text>;
  if (!offers.length) return <Text>Нет входящих предложений</Text>;

  return (
    <FlatList
      data={offers}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text>Заказ: {item.orderId}</Text>
          <Text>Статус: {item.status}</Text>
          <Text>Описание: {item.orderSnapshot?.shortDesc}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => onAccept(item.id, 500)}>
              <Text style={{ color: '#32B8C6' }}>Принять за 500₽</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDecline(item.id)}>
              <Text style={{ color: '#ff4444' }}>Отклонить</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
};
*/
