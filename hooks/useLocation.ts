import { useState, useEffect } from 'react';
import { locationManager } from '@rnmapbox/maps';
import { Alert, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { requestLocationPermission } from '~/utils/Permissions';

const useLocation = () => {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getCurrentLocation = async () => {
    try {
      const location = await locationManager.getLastKnownLocation();
      if (location) {
        setLocation([location.coords.longitude, location.coords.latitude]);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'Could not retrieve current location.');
    }
  };

  const checkPermissionsAndGetLocation = async () => {
    try {
      const permissionGranted: any = await requestLocationPermission();
      setHasLocationPermission(permissionGranted);

      if (permissionGranted) {
        try {
          await getCurrentLocation();
        } catch (locationError) {
          console.warn('Error getting location:', locationError);
          Alert.alert(
            'Location Error',
            'Unable to retrieve your current location. Please check your device settings and try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Permission Denied',
          'You need to grant location permissions to use all features of this app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error in checkPermissionsAndGetLocation:', error);
      Alert.alert('Error', 'An unexpected error occurred while setting up location services.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkPermissionsAndGetLocation();
  }, []);

  return { location, hasLocationPermission, isLoading };
};

export default useLocation;
