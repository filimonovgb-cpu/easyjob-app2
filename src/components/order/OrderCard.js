import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export const OrderCard = React.memo(({ order, onPress }) => {
  const { t } = useTranslation();

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted': return '#32B8C6';
      case 'inProgress': return '#4169E1';
      case 'completed': return '#32CD32';
      case 'cancelled': return '#FF4444';
      default: return '#999';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time';
      case 'accepted': return 'checkmark-circle';
      case 'inProgress': return 'hourglass';
      case 'completed': return 'checkmark-done-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => onPress(order)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.orderId}>#{order.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Ionicons 
            name={getStatusIcon(order.status)} 
            size={16} 
            color={getStatusColor(order.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {t(order.status)}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Ionicons name="location" size={18} color="#666" />
          <Text style={styles.address} numberOfLines={1}>
            {order.address}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="calendar" size={18} color="#666" />
          <Text style={styles.text}>
            {new Date(order.date).toLocaleDateString('ru-RU')} в {order.time}
          </Text>
        </View>

        {order.professionalName && (
          <View style={styles.row}>
            <Ionicons name="person" size={18} color="#666" />
            <Text style={styles.text}>{order.professionalName}</Text>
          </View>
        )}

        <Text style={styles.description} numberOfLines={2}>
          {order.description}
        </Text>
      </View>

      {order.price && (
        <View style={styles.footer}>
          <Text style={styles.price}>{order.price} ₽</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#32B8C6',
    textAlign: 'right',
  },
});
