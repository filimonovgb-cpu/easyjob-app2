import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../../constants/categories';

export const ProfessionalCard = React.memo(({ professional, onPress }) => {
  const { t } = useTranslation();
  const category = CATEGORIES.find(c => c.id === professional.categoryId);

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => onPress(professional)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: professional.photo }} 
        style={styles.photo}
      />
      
      <View style={styles.info}>
        <Text style={styles.name}>
          {professional.firstName} {professional.lastName}
        </Text>
        
        <Text style={styles.category}>
          {t(category?.name || 'category')}
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.statText}>{professional.rating}</Text>
          </View>
          
          <View style={styles.stat}>
            <Ionicons name="chatbubble" size={16} color="#666" />
            <Text style={styles.statText}>{professional.reviews}</Text>
          </View>
          
          {professional.distance && (
            <View style={styles.stat}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.statText}>{professional.distance} км</Text>
            </View>
          )}
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.price}>{professional.pricePerHour} ₽/час</Text>
          <Text style={styles.experience}>
            {t('experience')}: {professional.experience} {t('years')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#32B8C6',
  },
  experience: {
    fontSize: 12,
    color: '#999',
  },
});
