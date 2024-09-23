import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';


interface Location {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
}

const DashboardScreen: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => {
    // Set up timer to update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Get user's location
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization();
    }
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        fetchLocationInfo(latitude, longitude);
      },
      error => console.log('Error getting location:', error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    return () => clearInterval(timer);
  }, []);

  const fetchLocationInfo = async (latitude: number, longitude: number) => {
    try {
      const response = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_OPENCAGE_API_KEY`
      );
      const result = response.data.results[0].components;
      setLocation({
        latitude,
        longitude,
        city: result.city || result.town || result.village || '',
        state: result.state || '',
      });
    } catch (error) {
      console.error('Error fetching location info:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ... Previous header code ... */}

      <Text style={styles.greeting}>Hello, Daniel</Text>
      <Text style={styles.date}>
        {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      </Text>
      <Text style={styles.time}>{formatTime(currentTime)}</Text>
      <Text style={styles.balance}>$ 10,000.00</Text>

      <View style={styles.locationCard}>
        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>Home location</Text>
          <Text style={styles.locationName}>
            {location ? `${location.city}, ${location.state}` : 'Loading...'}
          </Text>
          <View style={styles.coordinates}>
            <Text style={styles.coordinateText}>Longitude</Text>
            <Text style={styles.coordinateValue}>
              {location ? `${location.longitude.toFixed(3)}°` : 'Loading...'}
            </Text>
          </View>
          <View style={styles.coordinates}>
            <Text style={styles.coordinateText}>Latitude</Text>
            <Text style={styles.coordinateValue}>
              {location ? `${location.latitude.toFixed(3)}°` : 'Loading...'}
            </Text>
          </View>
        </View>
        {/* ... Weather info ... */}
      </View>

      {/* ... Rest of the component ... */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... Previous styles ...
  time: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  // ... Rest of the styles ...
});

export default DashboardScreen;