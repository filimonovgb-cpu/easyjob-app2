import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

export const useImagePicker = () => {
  const { t } = useTranslation();
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermission = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          t('permissionGallery'),
          t('permissionGallery'),
          [
            { text: t('cancel'), style: 'cancel' },
            { 
              text: t('openSettings'), 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const pickImage = async () => {
    setIsLoading(true);

    try {
      const hasPermission = await requestPermission();
      
      if (!hasPermission) {
        setIsLoading(false);
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setImage(imageUri);
        setIsLoading(false);
        return imageUri;
      }

      setIsLoading(false);
      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(t('errorImagePicker'), error.message);
      setIsLoading(false);
      return null;
    }
  };

  const takePhoto = async () => {
    setIsLoading(true);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('permissionGallery'));
        setIsLoading(false);
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setImage(imageUri);
        setIsLoading(false);
        return imageUri;
      }

      setIsLoading(false);
      return null;
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(t('errorImagePicker'), error.message);
      setIsLoading(false);
      return null;
    }
  };

  const clearImage = () => {
    setImage(null);
  };

  return {
    image,
    isLoading,
    pickImage,
    takePhoto,
    clearImage,
    setImage
  };
};
