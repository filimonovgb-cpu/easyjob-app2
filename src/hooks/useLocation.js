import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

export const useLocation = () => {
  const { t } = useTranslation();
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          t('permissionLocation'),
          t('permissionLocation'),
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

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = await requestPermission();
      
      if (!hasPermission) {
        setError(t('permissionLocation'));
        setIsLoading(false);
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        timestamp: currentLocation.timestamp
      };

      setLocation(locationData);
      setIsLoading(false);
      return locationData;
    } catch (error) {
      console.error('Location error:', error);
      setError(t('errorLocation'));
      setIsLoading(false);
      return null;
    }
  };

  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        return `${addr.street || ''} ${addr.name || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
    getAddressFromCoords,
    requestPermission
  };
};
