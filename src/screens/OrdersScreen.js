import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '../contexts/OrderContext';
import { OrderCard } from '../components/order/OrderCard';

export const OrdersScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { orders, isLoading, refreshOrders } = useOrders();
  const [filter, setFilter] = useState('all');

  const filters = [
    { key: 'all', label: t('allOrders'), icon: 'list' },
    { key: 'pending', label: t('pending'), icon: 'time' },
    { key: 'accepted', label: t('accepted'), icon: 'checkmark-circle' },
    { key: 'inProgress', label: t('inProgress'), icon: 'hourglass' },
    { key: 'completed', label: t('completed'), icon: 'checkmark-done-circle' },
  ];

  const filteredOrders =
    filter === 'all'
      ? orders
      : orders.filter((order) => order.status === filter);

  const handleOrderPress = (order) => {
    navigation.navigate('OrderDetail', { order });
  };

  const handleCreateOrder = () => {
    navigation.navigate('CreateOrder');
  };

  const renderFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        filter === item.key && styles.filterChipSelected,
      ]}
      onPress={() => setFilter(item.key)}
    >
      <Ionicons
        name={item.icon}
        size={18}
        color={filter === item.key ? '#fff' : '#666'}
      />
      <Text
        style={[
          styles.filterText,
          filter === item.key && styles.filterTextSelected,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderOrder = ({ item }) => (
    <OrderCard order={item} onPress={handleOrderPress} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>{t('noOrders')}</Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateOrder}>
        <Text style={styles.createButtonText}>{t('createOrder')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('myOrders')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateOrder}
        >
          <Ionicons name="add-circle" size={32} color="#32B8C6" />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={filters}
        renderItem={renderFilter}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={styles.filtersList}
        contentContainerStyle={styles.filtersContent}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#32B8C6" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          onRefresh={refreshOrders}
          refreshing={isLoading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  filtersList: {
    maxHeight: 60,
    marginVertical: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipSelected: {
    backgroundColor: '#32B8C6',
    borderColor: '#32B8C6',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#32B8C6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
