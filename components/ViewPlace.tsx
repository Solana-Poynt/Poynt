import React, { useRef, useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import WeatherGrid from './icons/weatherForcast';

interface Place {
  id: string;
  name: string;
  coordinates: [number, number] | number[];
  distance?: number;
  rating?: number;
}
interface ViewPlaceProps {
  selectedPlace: Place | null;
  handleCancel: () => void;
}

interface WeatherItem {
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  temperature: number;
}

// make up data:
const weatherData: WeatherItem[] = [
  { time: '9:00', icon: 'sunny', color: '#FFC107', temperature: 22 },
  { time: '12:00', icon: 'rainy', color: '#2196F3', temperature: 18 },
  { time: '15:00', icon: 'cloudy', color: '#607D8B', temperature: 20 },
  { time: '18:00', icon: 'cloudy', color: '#607D8B', temperature: 19 },
];

const ViewPlace: React.FC<ViewPlaceProps> = ({ selectedPlace, handleCancel }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (selectedPlace) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [selectedPlace]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={[400]}
      enablePanDownToClose
      onClose={handleCancel}
      style={{
        zIndex: 1000,
      }}
      backgroundStyle={{ backgroundColor: '#fff' }}>
      {selectedPlace && (
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.header}>
            <Text style={styles.placeName}>{selectedPlace.name}</Text>
            <View style={styles.placeDistance}>
              <MaterialCommunityIcons name="map-marker-distance" size={24} color="white" />
              <Text style={styles.placeText}>
                {(selectedPlace.distance ? selectedPlace.distance / 1000 : 0).toFixed(2)} km
              </Text>
            </View>
          </View>

          <View style={styles.visitButtons}>
            <View>
              <Image style={{ width: 103, height: 63 }} source={require('../assets/drive.png')} />
            </View>
            <View style={{ flexDirection: 'column', marginTop: 18, gap: 4 }}>
              <Text style={{ color: 'black', fontWeight: '600', fontSize: 13 }}>ETA: 15 mins</Text>
            </View>
            <View>
              <Text style={styles.placeName}>$4.00</Text>
            </View>
          </View>

          <View
            style={{
              marginTop: 28,
              backgroundColor: '#801414',
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 10,
            }}>
            <TouchableOpacity style={styles.visitButton} onPress={handleCancel}>
              <Text style={styles.visitButtonText}>Book</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 9,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 'auto',
    paddingTop: 32,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeName: {
    maxWidth: 220,
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeDistance: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#801414',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
    position: 'absolute',
    right: 0,
    top: 10,
  },

  placeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  visitButtons: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderColor: 'white',
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#0005',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  visitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  visitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },

  ratings: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingsText: {
    fontSize: 14,
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 16,
  },
  sectionsContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderColor: '#0002',
    paddingTop: 8,
  },
  sectionButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  activeSectionButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#B71C1C',
  },
  sectionButtonText: {
    fontSize: 14,
    color: '#757575',
  },
  activeSectionButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  sectionContent: {
    flex: 1,
  },

  placeDescription: {
    display: 'flex',
    // textAlign: 'center',
    fontSize: 14,
  },
  weatherContainer: {
    // flexDirection: 'row',
    // justifyContent: 'space-around',
    // marginTop: 10,
  },
  placeholderText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
});

export default ViewPlace;
