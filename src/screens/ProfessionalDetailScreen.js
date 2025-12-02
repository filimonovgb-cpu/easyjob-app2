// src/screens/ProfessionalDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';

export const ProfessionalDetailScreen = ({ route }) => {
  const { professional } = route.params || {};

  if (!professional) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Профиль специалиста</Text>
        <Text style={styles.text}>Данные специалиста не переданы.</Text>
      </View>
    );
  }

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
            {professional.categoryId || 'Категория не указана'}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
});
