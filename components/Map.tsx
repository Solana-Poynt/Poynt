import { Text } from 'react-native';
import Mapbox, {
  Camera,
  LocationPuck,
  locationManager,
  MapView,
  UserLocation,
  PointAnnotation,
  MarkerView,
} from '@rnmapbox/maps';
import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { requestLocationPermission } from '~/utils/Permissions';
import SearchBarWithSuggestions from './SearchBar';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_CODE || '');

export default function Map() {
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [hasMapError, setHasMapError] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<[number, number] | any>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | undefined>(false);
  const mapRef = useRef<MapView>(null);
  const cameraRef = useRef<Camera>(null);

  const getCurrentLocation = async () => {
    try {
      const location = await locationManager.getLastKnownLocation();
      if (location) {
        setUserLocation([location.coords.longitude, location.coords.latitude]);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'Could not retrieve current location.');
    }
  };

  useEffect(() => {
    const checkPermissionsAndGetLocation = async () => {
      try {
        const permissionGranted = await requestLocationPermission();
        setHasLocationPermission(permissionGranted);

        if (permissionGranted) {
          await getCurrentLocation();
        } else {
          Alert.alert(
            'Permission Denied',
            'You need to grant location permissions to use all features of this app.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error in checkPermissionsAndGetLocation:', error);
      }
    };

    checkPermissionsAndGetLocation();
  }, []);

 
  const onMapError = () => setHasMapError(true);
  const onMapLoad = () => setIsMapReady(true);


  const centerOnUser = () => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  };



  const onUserLocationUpdate = (location: any) => {
    setUserLocation([location.coords.longitude, location.coords.latitude]);
  };
  if (hasMapError) {
    return (
      <View style={styles.errorContainer}>
        <Text>An error occurred while loading the map.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <SearchBarWithSuggestions/>
      {userLocation ? (
        <View style={styles.container}>
          {/* loading should load the home banner  */}
          {/* {!isMapReady && (
        // <View style={styles.loadingContainer}>
        // </View>
      )} */}

          <MapView
            ref={mapRef}
            compassEnabled
            compassPosition={{ bottom: 90, left: 8 }}
            rotateEnabled={true}
            style={styles.map}
            zoomEnabled={true}
            scaleBarEnabled={false}
            onDidFinishLoadingMap={onMapLoad}
            onMapLoadingError={onMapError}
            attributionEnabled={false}>
            <Camera
              ref={cameraRef}
              zoomLevel={15}
              followZoomLevel={14}
              animationMode="flyTo"
              animationDuration={6000}
              followUserLocation={hasLocationPermission}
            />

            {/* <UserLocation
            androidRenderMode={'gps'}
            visible
            showsUserHeadingIndicator={true}
            onUpdate={onUserLocationUpdate}
          /> */}

            {hasLocationPermission && (
              <LocationPuck
                puckBearing="heading"
                puckBearingEnabled
                pulsing={{ isEnabled: true }}
              />
            )}
          </MapView>

          {hasLocationPermission && (
            <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
              <Text style={styles.buttonText}>Center on Me</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text>Unable to load map. Please check your location settings.</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 3,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchBarPlaceholder: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchBarText: {
    color: '#999',
  },
});
