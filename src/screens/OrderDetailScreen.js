// src/screens/OrderDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export const OrderDetailScreen = ({ route }) => {
  const { order } = route.params || {};

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Детали заказа</Text>
        <Text style={styles.text}>Данные заказа не переданы.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Детали заказа</Text>

      <Text style={styles.label}>ID заказа:</Text>
      <Text style={styles.text}>{order.id || order.orderId || '-'}</Text>

      <Text style={styles.label}>Адрес:</Text>
      <Text style={styles.text}>{order.address || '-'}</Text>

      <Text style={styles.label}>Описание:</Text>
      <Text style={styles.text}>{order.description || '-'}</Text>

      <Text style={styles.label}>Дата и время:</Text>
      <Text style={styles.text}>
        {order.date || ''} {order.time || ''}
      </Text>

      <Text style={styles.label}>Статус:</Text>
      <Text style={styles.text}>{order.status || '-'}</Text>

      <Text style={styles.label}>Пользователь:</Text>
      <Text style={styles.text}>{order.userId || '-'}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
  },
});
