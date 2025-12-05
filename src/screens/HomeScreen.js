import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useProfessionals } from '../hooks/useProfessionals';
import { useLocation } from '../hooks/useLocation';
import { ProfessionalCard } from '../components/professional/ProfessionalCard';
import { CATEGORIES } from '../constants/categories';

// Offers hook
import { useOffersForContractor } from '../hooks/useOffers';

export const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const { location, getCurrentLocation, isLoading: locationLoading } = useLocation();
  const [selectedCategory, setSelectedCategory] = useState(null);

  const {
    professionals,
    isLoading,
    refresh
  } = useProfessionals(selectedCategory);

  // !!! Защита: если user.id отсутствует (редкие случаи при login)
  const contractorIdSafe = user?.id ?? null;

  const { offers = [], loading: offersLoading } =
    role === 'executor' && contractorIdSafe
      ? useOffersForContractor(contractorIdSafe)
      : { offers: [], loading: false };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleRefresh = async () => {
    await getCurrentLocation();
    await refresh();
  };

  const handleProfessionalPress = (professional) => {
    navigation.navigate('ProfessionalDetail', { professional });
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && styles.categoryChipSelected,
      ]}
      onPress={() =>
        setSelectedCategory(selectedCategory === item.id ? null : item.id)
      }
    >
      <Ionicons
        name={item.icon}
        size={20}
        color={selectedCategory === item.id ? '#fff' : item.color}
      />
      <Text
        style={[
          styles.categoryChipText,
          selectedCategory === item.id && styles.categoryChipTextSelected,
        ]}
      >
        {t(item.name)}
      </Text>
    </TouchableOpacity>
  );

  const renderProfessional = ({ item }) => (
    <ProfessionalCard professional={item} onPress={handleProfessionalPress} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search" size={64} color="#ccc" />
      <Text style={styles.emptyText}>{t('noProfessionals')}</Text>
    </View>
  );

  // Count unread incoming offers
  const incomingCount = (offers || []).filter(o => o.status === 'pending').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Greeting + location */}
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {t('hello')}, {user?.firstName}!
          </Text>

          {location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.locationText}>{t('nearYou')}</Text>
            </View>
          )}
        </View>

        {/* Contractor Offers Button */}
        {role === 'executor' && contractorIdSafe && (
          <TouchableOpacity
            style={styles.offersIconWrap}
            onPress={() =>
              navigation.navigate('ContractorOffers', {
                contractorId: contractorIdSafe,
              })
            }
          >
            <Ionicons name="notifications" size={26} color="#32B8C6" />

            {incomingCount > 0 && (
              <View style={styles.offersBadge}>
                <Text style={styles.offersBadgeText}>{incomingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesList}
        contentContainerStyle={styles.categoriesContent}
      />

      {isLoading && !professionals.length ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#32B8C6" />
        </View>
      ) : (
        <FlatList
          data={professionals}
          renderItem={renderProfessional}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || locationLoading}
              onRefresh={handleRefresh}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },

  header: {
    flexDirection: 'row',
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
    alignItems: 'flex-start',
  },

  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 14, color: '#666', marginLeft: 4 },

  offersIconWrap: {
    marginLeft: 12,
    marginTop: 6,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
  },

  offersBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  offersBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  categoriesList: { maxHeight: 60, marginVertical: 16 },
  categoriesContent: { paddingHorizontal: 20 },

  categoryChip: {
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
  categoryChipSelected: {
    backgroundColor: '#32B8C6',
    borderColor: '#32B8C6',
  },
  categoryChipText: { fontSize: 14, color: '#333', marginLeft: 8, fontWeight: '600' },
  categoryChipTextSelected: { color: '#fff' },

  listContent: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 16 },
});
