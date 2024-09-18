import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface Place {
  id: string;
  name: string;
  coordinates: [number, number] | number[];
  distance?: number;
}

interface ViewPlaceProps {
  selectedPlace: Place | null;
  handleCancel: () => void;
}

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
      snapPoints={[250]}
      enablePanDownToClose
      onClose={handleCancel}
      backgroundStyle={{ backgroundColor: '#ffff' }}>
      {selectedPlace && (
        <BottomSheetView style={styles.bottomSheetContent}>
          <View>
            <Text style={styles.placeName}>{selectedPlace.name}</Text>
          </View>
          <View style={styles.visitButtons}>
            <TouchableOpacity style={styles.visitButton} onPress={handleCancel}>
              <MaterialIcons name="push-pin" size={20} color="grey" />
              <Text style={styles.visitButtonText}>visit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.visitButton} onPress={handleCancel}>
              <Text style={styles.visitButtonText}>visit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.visitButton} onPress={handleCancel}>
              <Text style={styles.visitButtonText}>visit</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.placeDistance}>
            Distance: {(selectedPlace.distance ? selectedPlace.distance / 1000 : 0).toFixed(2)} km
          </Text>

          <Text style={styles.placeDescription}>
            This is a dummy description. Replace with actual data later.
          </Text>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </BottomSheetView>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetContent: {
    flex: 1,
    padding: 24,
    gap: 20,
  },
  placeName: {
    fontSize: 20,
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
    backgroundColor: '#B71C1C',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  visitButtons: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    alignItems: 'center',
    textAlign: 'center',
  },
  visitButton: {
    backgroundColor: 'grey',
    display: "flex",
    flexDirection: "row",
    textAlign: "center",
    justifyContent: "center",
    padding: 6,
    borderRadius: 5,
    alignItems: 'center',
  },
  visitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ViewPlace;
