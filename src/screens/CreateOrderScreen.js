import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useOrders } from '../contexts/OrderContext';
import { useLocation } from '../hooks/useLocation';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const CreateOrderScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { createOrder } = useOrders();
  const { location, getCurrentLocation, getAddressFromCoords } = useLocation();

  const [formData, setFormData] = useState({
    address: '',
    description: '',
    date: new Date(),
    time: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleGetCurrentLocation = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      const address = await getAddressFromCoords(loc.latitude, loc.longitude);
      if (address) {
        setFormData({ ...formData, address });
      }
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.address.trim()) {
      newErrors.address = t('errorFillFields');
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      newErrors.description = t('errorFillFields');
    }
    if (!formData.time) {
      newErrors.time = t('errorFillFields');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        ...formData,
        latitude: location?.latitude,
        longitude: location?.longitude,
      };

      const result = await createOrder(orderData);

      if (result.success) {
        Alert.alert(t('success'), t('orderCreated'), [
          {
            text: t('ok'),
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert(t('error'), t('errorGeneral'));
      }
    } catch (error) {
      console.error('Create order error:', error);
      Alert.alert(t('error'), error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate });
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setFormData({ ...formData, time: `${hours}:${minutes}` });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>{t('createOrder')}</Text>

            <View style={styles.addressContainer}>
              <Input
                label={t('address')}
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
                placeholder={t('enterAddress')}
                error={errors.address}
                style={styles.addressInput}
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetCurrentLocation}
              >
                <Text style={styles.locationButtonText}>📍</Text>
              </TouchableOpacity>
            </View>

            <Input
              label={t('description')}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              placeholder={t('describeYourTask')}
              multiline
              numberOfLines={4}
              error={errors.description}
            />

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateLabel}>{t('selectDate')}</Text>
              <Text style={styles.dateValue}>
                {formData.date.toLocaleDateString('ru-RU')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={formData.date}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateLabel}>{t('selectTime')}</Text>
              <Text style={styles.dateValue}>
                {formData.time || t('selectTime')}
              </Text>
            </TouchableOpacity>
            {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}

            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}

            <Button
              title={t('sendOrder')}
              onPress={handleSubmit}
              isLoading={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressInput: {
    flex: 1,
    marginRight: 8,
  },
  locationButton: {
    width: 50,
    height: 50,
    backgroundColor: '#32B8C6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  locationButtonText: {
    fontSize: 24,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateValue: {
    fontSize: 16,
    color: '#666',
  },
  submitButton: {
    marginTop: 24,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
  },
});
