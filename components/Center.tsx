import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRef, useEffect } from 'react';
import { Camera } from '@rnmapbox/maps';

interface CenterProps {
  userLocation: [number, number] | number[];
  onCenterSelect: (location: [number, number] | number[]) => void;
}

const Center: React.FC<CenterProps> = ({ userLocation, onCenterSelect }) => {
  const centerOnUser = () => {
    onCenterSelect(userLocation);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Text style={styles.buttonText}>Center on Me</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  centerButton: {
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
});

export default Center;
