import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WeatherItem {
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  temperature: number;
}

interface WeatherGridProps {
  weatherData: WeatherItem[];
}

const WeatherGrid: React.FC<WeatherGridProps> = ({ weatherData }) => {
  const renderWeatherItem = (item: WeatherItem) => (
    <View style={styles.weatherItemOuter} key={item.time}>
      <View style={styles.weatherItemInner}>
        <Text style={styles.temperature}>{item.temperature}°C</Text>
        <Ionicons name={item.icon} size={26} color={item.color} />
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </View>
  );

  return <View style={styles.container}>{weatherData.map(renderWeatherItem)}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    textAlign: 'center',
    gap: 9,
    justifyContent: 'center',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    borderColor: 'white',
    backgroundColor: 'white',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 5,
    // justifyContent: 'space-around',
  },

  weatherItemOuter: {
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#0009',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  weatherItemInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    backgroundColor: 'white',
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    borderColor: '#0002',
    borderRadius: 12,
    width: 70,
  },
  time: {
    fontSize: 12,
  },
  temperature: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default WeatherGrid;
