// import { Text } from 'react-native';
// import Mapbox, { Camera, LocationPuck, MapView } from '@rnmapbox/maps';
// import { StyleSheet, View } from 'react-native';
// import MapboxSearch from '../../../components/SearchBar';
// import SelectedPlace from '../../../components/SelectedPlace';
// import ViewPlace from '../../../components/ViewPlace';
// import { useWeatherInfo } from '~/hooks/useLocation';
// import { Stack } from 'expo-router';
// import { AdProvider, useAdContext } from '~/utils/adContext';
// import QRCodeScanner from '~/components/qr';
// import AdWatchingModal from '~/components/adWatchinModal';
// import React, { useState, useRef, useEffect, useCallback } from 'react';

// Mapbox.setAccessToken(process.env.EXPO_PUBLIC_CODE || '');
// // [number, number] | number[]

// interface Place {
//   id: string;
//   name: string;
//   coordinates: [number, number] | any;
//   distance?: number;
// }

// const NavigateContent: React.FC = () => {
//   const [isMapReady, setIsMapReady] = useState(false);
//   const [hasMapError, setHasMapError] = useState(false);
//   const [userLocation, setUserLocation] = useState<[number, number] | undefined>();
//   const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
//   const [showPlaceDetails, setShowPlaceDetails] = useState(false);
//   const [showQRScanner, setShowQRScanner] = useState(false);
//   const [showAdModal, setShowAdModal] = useState(false);
//   const [scannedDriverId, setScannedDriverId] = useState<string | null>(null);

//   const { location, hasLocationPermission } = useWeatherInfo();
//   const { setAdWatched } = useAdContext();

//   const mapRef = useRef<MapView>(null);
//   const cameraRef = useRef<Camera>(null);

//   useEffect(() => {
//     if (hasLocationPermission && location) {
//       setUserLocation(location);
//     }
//   }, [location, hasLocationPermission]);

//   const resetAllStates = useCallback(() => {
//     setSelectedPlace(null);
//     setShowPlaceDetails(false);
//     setShowQRScanner(false);
//     setShowAdModal(false);
//     setScannedDriverId(null);
//     setAdWatched(false);
//   }, [setAdWatched]);

//   const handlePlaceSelect = useCallback(
//     (place: Place) => {
//       resetAllStates();
//       setSelectedPlace(place);
//       setShowPlaceDetails(true);
//       cameraRef.current?.setCamera({
//         centerCoordinate: place.coordinates,
//         zoomLevel: 15,
//         animationDuration: 3000,
//       });
//     },
//     [resetAllStates]
//   );

//   const handleWatchAdRequest = useCallback(() => {
//     setShowQRScanner(true);
//   }, []);

//   const handleQRCodeScanned = useCallback((driverId: string) => {
//     setScannedDriverId(driverId);
//     setShowQRScanner(false);
//     setShowAdModal(true);
//   }, []);

//   const handleAdComplete = useCallback(() => {
//     setShowAdModal(false);
//     setScannedDriverId(null);
//   }, []);

//   const handleCancel = useCallback(() => {
//     resetAllStates();
//     cameraRef.current?.setCamera({
//       centerCoordinate: userLocation,
//       zoomLevel: 14,
//       animationDuration: 2000,
//     });
//   }, [resetAllStates, userLocation]);

//   const onMapError = useCallback(() => setHasMapError(true), []);
//   const onMapLoad = useCallback(() => setIsMapReady(true), []);

//   if (hasMapError) {
//     return (
//       <View style={styles.errorContainer}>
//         <Text>An error occurred while loading the map.</Text>
//       </View>
//     );
//   }

//   return (
//     <>
//       <Stack.Screen options={{ title: 'Navigate', headerShown: false }} />
//       <View style={styles.container}>
//         <MapView
//           style={styles.map}
//           ref={mapRef}
//           compassEnabled
//           compassPosition={{ bottom: 191, left: 14 }}
//           scaleBarEnabled={false}
//           onDidFinishLoadingMap={onMapLoad}
//           onMapLoadingError={onMapError}>
//           <Camera
//             centerCoordinate={userLocation}
//             ref={cameraRef}
//             zoomLevel={14}
//             followZoomLevel={14}
//             animationMode="flyTo"
//             animationDuration={2000}
//             followUserLocation
//           />
//           <SelectedPlace selectedPlace={selectedPlace} onPlaceSelect={handlePlaceSelect} />
//           {hasLocationPermission && (
//             <LocationPuck puckBearing="heading" puckBearingEnabled pulsing={{ isEnabled: true }} />
//           )}
//         </MapView>

//         {userLocation && isMapReady && (
//           <MapboxSearch
//             userLocation={userLocation}
//             onPlaceSelect={handlePlaceSelect}
//             mapReady={isMapReady}
//           />
//         )}

//         {showPlaceDetails && selectedPlace && (
//           <ViewPlace
//             selectedPlace={selectedPlace}
//             handleCancel={handleCancel}
//             onWatchAdRequest={handleWatchAdRequest}
//           />
//         )}

//         {showQRScanner && (
//           <QRCodeScanner
//             onQRCodeScanned={handleQRCodeScanned}
//             onCancel={() => setShowQRScanner(false)}
//           />
//         )}

//         {showAdModal && scannedDriverId && (
//           <AdWatchingModal
//             isVisible={showAdModal}
//             onComplete={handleAdComplete}
//             driverId={scannedDriverId}
//           />
//         )}
//       </View>
//     </>
//   );
// };

// const Navigate: React.FC = () => (
//   <AdProvider>
//     <NavigateContent />
//   </AdProvider>
// );

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 3,
//     backgroundColor: 'transparent',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 10,
//   },
//   map: {
//     flex: 1,
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   centerButton: {
//     position: 'absolute',
//     bottom: 16,
//     right: 16,
//     backgroundColor: '#007AFF',
//     padding: 10,
//     borderRadius: 8,
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   searchBarPlaceholder: {
//     position: 'absolute',
//     top: 50,
//     left: 16,
//     right: 16,
//     height: 40,
//     backgroundColor: 'white',
//     borderRadius: 20,
//     justifyContent: 'center',
//     paddingHorizontal: 16,
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   searchBarText: {
//     color: '#999',
//   },
//   placeDetailsContainer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     backgroundColor: 'white',
//     padding: 20,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     elevation: 5,
//   },
//   placeName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 5,
//   },
//   placeDistance: {
//     fontSize: 14,
//     color: 'gray',
//     marginBottom: 10,
//   },
//   placeDescription: {
//     fontSize: 14,
//   },
//   cancelButton: {
//     backgroundColor: '#ff6b6b',
//     padding: 10,
//     borderRadius: 5,
//     alignItems: 'center',
//   },
//   cancelButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
// });

// export default Navigate;

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
