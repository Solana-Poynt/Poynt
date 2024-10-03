import { Text } from 'react-native';
import Mapbox, { Camera, LocationPuck, MapView } from '@rnmapbox/maps';
import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapboxSearch from './SearchBar';
import SelectedPlace from './SelectedPlace';
import ViewPlace from './ViewPlace';
import { useWeatherInfo } from '~/hooks/useLocation';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_CODE || '');
// [number, number] | number[]

interface Location {
  latitude: number;
  longitude: number;
}
interface Place {
  id: string;
  name: string;
  coordinates: [number, number] | number[];
  distance?: number;
}

export default function Map() {
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [hasMapError, setHasMapError] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<[number, number] | number[]>();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const { location, hasLocationPermission } = useWeatherInfo();

  const mapRef = useRef<MapView>(null);
  const cameraRef = useRef<Camera>(null);

  const [showPlaceDetails, setShowPlaceDetails] = useState<boolean>(false);

  useEffect(() => {
    if (hasLocationPermission && location) {
      setUserLocation(location);
    }
  }, [location, hasLocationPermission]);

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    setShowPlaceDetails(true);
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: place.coordinates,
        zoomLevel: 15,
        animationDuration: 3000,
      });
    }
  };

  const handleCenterSelect = (location: [number, number] | number[]) => {
    cameraRef.current?.setCamera({
      centerCoordinate: location,
      zoomLevel: 14,
      animationDuration: 2000,
    });
  };

  const onMapError = () => setHasMapError(true);
  const onMapLoad = () => setIsMapReady(true);

  const handleCancel = () => {
    setSelectedPlace(null);
    setShowPlaceDetails(false);

    cameraRef.current?.setCamera({
      centerCoordinate: userLocation,
      zoomLevel: 14,
      animationDuration: 2000,
    });
  };

  if (hasMapError) {
    return (
      <View style={styles.errorContainer}>
        <Text>An error occurred while loading the map.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={{ flex: 1 }}
        ref={mapRef}
        compassEnabled
        compassPosition={{ bottom: 191, left: 14 }}
        scaleBarEnabled={false}
        onDidFinishLoadingMap={onMapLoad}
        onMapLoadingError={onMapError}>
        <Camera
          centerCoordinate={userLocation}
          ref={cameraRef}
          zoomLevel={14}
          followZoomLevel={14}
          animationMode="flyTo"
          animationDuration={2000}
          followUserLocation
        />

        <SelectedPlace selectedPlace={selectedPlace} onPlaceSelect={handlePlaceSelect} />

        {hasLocationPermission && (
          <LocationPuck puckBearing="heading" puckBearingEnabled pulsing={{ isEnabled: true }} />
        )}
      </MapView>

      {/* {userLocation && <Center userLocation={userLocation} onCenterSelect={handleCenterSelect} />} */}

      {userLocation && (
        <MapboxSearch userLocation={userLocation} onPlaceSelect={handlePlaceSelect} />
      )}
      {showPlaceDetails && selectedPlace && (
        <ViewPlace selectedPlace={selectedPlace} handleCancel={handleCancel} />
      )}
    </View>
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
  placeDetailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
  },
  placeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  placeDistance: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 10,
  },
  placeDescription: {
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#ff6b6b',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

// {selectedPlace && (
//   <ShapeSource
//     id="selected-place"
//     shape={{
//       type: 'FeatureCollection',
//       features: [
//         {
//           type: 'Feature',
//           geometry: {
//             type: 'Point',
//             coordinates: selectedPlace.coordinates,
//           },
//           properties: {
//             name: selectedPlace.name,
//           },
//         },
//       ],
//     }}>
//     <SymbolLayer
//       id="selected-place-icon"
//       style={{
//         iconImage: 'pin',
//         iconSize: 0.2,
//         iconAllowOverlap: false,
//         iconAnchor: 'bottom',
//       }}
//     />
//     <Images images={{ pin: require('../assets/pin.png') }} />
//   </ShapeSource>
// )}
