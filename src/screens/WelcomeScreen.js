import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/common/Button';

export const WelcomeScreen = ({ navigation }) => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="hammer" size={80} color="#32B8C6" />
        <Text style={styles.title}>EasyJob</Text>
        <Text style={styles.subtitle}>{t('selectRole')}</Text>

        <View style={styles.buttonsContainer}>
          <Button
            title={t('client')}
            onPress={() => navigation.navigate('Registration', { role: 'client' })}
            style={styles.button}
          />
          
          <Button
            title={t('executor')}
            onPress={() => navigation.navigate('Registration', { role: 'executor' })}
            variant="outline"
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
    marginBottom: 48,
  },
  buttonsContainer: {
    width: '100%',
  },
  button: {
    marginBottom: 16,
  },
});
