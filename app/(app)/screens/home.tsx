import { Stack } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const Home: React.FC = () => {
  return (
    <>
      <Stack.Screen options={{ title: 'Onboard', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {/* <View style={styles.header}>
          <TouchableOpacity style={styles.giftButton}>
            <Ionicons name="gift" size={24} color="black" />
            <Text style={styles.giftText}>Claim daily point</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="notifications" size={24} color="black" />
          </TouchableOpacity>
        </View> */}

        <Text style={styles.greeting}>Hello, Daniel</Text>
        <Text style={styles.date}>Tuesday, Feb. 01</Text>
        <Text style={styles.balance}>$ 10,000.00</Text>

        <View style={styles.locationCard}>
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Home location</Text>
            <Text style={styles.locationName}>New Jersey, USA</Text>
            <View style={styles.coordinates}>
              <Text style={styles.coordinateText}>Longitude</Text>
              <Text style={styles.coordinateValue}>49.001°N</Text>
            </View>
            <View style={styles.coordinates}>
              <Text style={styles.coordinateText}>Latitude</Text>
              <Text style={styles.coordinateValue}>49.501°E</Text>
            </View>
          </View>
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherTitle}>Weather</Text>
            <MaterialCommunityIcons name="weather-lightning" size={24} color="black" />
            <Text style={styles.temperature}>32°C</Text>
            <Text style={styles.weatherCondition}>sunny</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your places</Text>
        <TouchableOpacity style={styles.placeItem}>
          <MaterialIcons name="work" size={24} color="black" />
          <Text style={styles.placeName}>Poynt enterprise</Text>
          <Ionicons name="chevron-forward-sharp" size={24} color="black" />
        </TouchableOpacity>
        <View style={styles.distanceInfo}>
          <Ionicons name="home-outline" size={24} color="black" />
          <Text style={styles.distanceText}>Distance from home : 5Km</Text>
          <MaterialCommunityIcons name="weather-lightning" size={24} color="black" />
          <Text style={styles.weatherText}>32°C sunny</Text>
        </View>

        <View style={styles.activityIcons}>
          {['directions-car', 'directions-run', 'directions-bike', 'directions-walk'].map(
            (iconName, index) => (
              <View key={index} style={styles.activityItem}>
                <Ionicons name="home-outline" size={24} color="black" />
                <Text style={styles.activityTime}>{`${index + 4}hrs ${(index + 1) * 20}m`}</Text>
              </View>
            )
          )}
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  giftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E1',
    padding: 10,
    borderRadius: 20,
  },
  giftText: {
    marginLeft: 5,
    color: '#FF6347',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginTop: 20,
    alignItems: 'stretch',
  },
  date: {
    fontSize: 16,
    color: '#666',
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 10,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#DC143C',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },
  locationInfo: {
    flex: 2,
  },
  weatherInfo: {
    flex: 1,
    alignItems: 'center',
  },
  locationTitle: {
    color: '#FFF',
    fontSize: 16,
  },
  locationName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  coordinates: {
    marginTop: 10,
  },
  coordinateText: {
    color: '#FFF',
    fontSize: 12,
  },
  coordinateValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  weatherTitle: {
    color: '#FFF',
    fontSize: 16,
  },
  temperature: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  weatherCondition: {
    color: '#FFF',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  placeName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  distanceText: {
    marginLeft: 5,
    marginRight: 10,
  },
  weatherText: {
    marginLeft: 5,
  },
  activityIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  activityItem: {
    alignItems: 'center',
  },
  activityTime: {
    marginTop: 5,
    fontSize: 12,
  },
});

export default Home;
