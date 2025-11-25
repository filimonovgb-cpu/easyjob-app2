import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useImagePicker } from '../hooks/useImagePicker';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { CATEGORIES } from '../constants/categories';
import { validatePhone } from '../utils/validators';

export const RegistrationScreen = ({ route, navigation }) => {
  const { role } = route.params;
  const { t } = useTranslation();
  const { register } = useAuth();
  const { image, pickImage, isLoading: imageLoading } = useImagePicker();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    categoryId: '',
    agreeData: false,
    acceptTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('errorFillFields');
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('errorFillFields');
    }
    if (!validatePhone(formData.phone)) {
      newErrors.phone = t('errorInvalidPhone');
    }
    if (!formData.categoryId) {
      newErrors.categoryId = t('errorFillFields');
    }
    if (!image) {
      newErrors.photo = t('errorUploadPhoto');
    }
    if (!formData.agreeData || !formData.acceptTerms) {
      newErrors.terms = t('errorAcceptTerms');
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
      const userData = {
        ...formData,
        photo: image,
        role,
      };

      const success = await register(userData, role);

      if (success) {
        Alert.alert(t('registrationCompleted'));
        navigation.navigate('SmsAuth', { phone: formData.phone });
      } else {
        Alert.alert(t('error'), t('errorGeneral'));
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(t('error'), error.message);
    } finally {
      setIsSubmitting(false);
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
            <Text style={styles.title}>
              {role === 'client' ? t('registerClient') : t('registerExecutor')}
            </Text>

            <TouchableOpacity
              style={styles.photoContainer}
              onPress={pickImage}
              disabled={imageLoading}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#999" />
                  <Text style={styles.photoText}>{t('uploadPhoto')}</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.photo && <Text style={styles.errorText}>{errors.photo}</Text>}

            <Input
              label={t('firstName')}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              placeholder={t('firstName')}
              error={errors.firstName}
            />

            <Input
              label={t('lastName')}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              placeholder={t('lastName')}
              error={errors.lastName}
            />

            <Input
              label={t('phone')}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="+7 (___) ___-__-__"
              keyboardType="phone-pad"
              error={errors.phone}
            />

            <Text style={styles.label}>{t('category')}</Text>
            <View style={styles.categoriesContainer}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    formData.categoryId === category.id && styles.categoryCardSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, categoryId: category.id })}
                >
                  <Ionicons
                    name={category.icon}
                    size={32}
                    color={
                      formData.categoryId === category.id ? '#fff' : category.color
                    }
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      formData.categoryId === category.id && styles.categoryTextSelected,
                    ]}
                  >
                    {t(category.name)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() =>
                setFormData({ ...formData, agreeData: !formData.agreeData })
              }
            >
              <Ionicons
                name={formData.agreeData ? 'checkbox' : 'square-outline'}
                size={24}
                color="#32B8C6"
              />
              <Text style={styles.checkboxText}>{t('agreeData')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() =>
                setFormData({ ...formData, acceptTerms: !formData.acceptTerms })
              }
            >
              <Ionicons
                name={formData.acceptTerms ? 'checkbox' : 'square-outline'}
                size={24}
                color="#32B8C6"
              />
              <Text style={styles.checkboxText}>{t('acceptTerms')}</Text>
            </TouchableOpacity>
            {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

            <Button
              title={t('continue')}
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
    textAlign: 'center',
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  categoryCardSelected: {
    backgroundColor: '#32B8C6',
    borderColor: '#32B8C6',
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  submitButton: {
    marginTop: 24,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginBottom: 12,
  },
});
