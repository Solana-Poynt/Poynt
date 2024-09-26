import { useState, useEffect, useCallback, useRef } from 'react';
import { locationManager } from '@rnmapbox/maps';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '~/utils/Permissions';
const API_KEY = process.env.EXPO_APP_API_KEY;

interface WeatherData {
  name: string;
  region: string;
  country: string;
  temp_c: number;
  feels_like: number;
  condition: string;
  dewpoint: number;
  heatindex: number;
  isday: number;
  precip: number;
  pressure: number;
  uv: number;
  viskm: any;
  windchill: number;
  icon: string;
  humidity: number;
  cloud: number;
  wind_mph: number;
  wind_dir: string;
}

interface WeatherAnalysis {
  heatPrediction: string;
  rainPrediction: string;
  uvPrediction: string;
  windPrediction: string;
  visibilityPrediction: string;
}

export const useWeatherInfo = () => {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | any>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const getCurrentLocation = async (): Promise<[number, number] | null> => {
    try {
      const location = await locationManager.getLastKnownLocation();
      if (location) {
        return [location.coords.longitude, location.coords.latitude];
      }
      return null;
    } catch (err) {
      console.error('Error fetching location:', err);
      Alert.alert('Error', 'Could not retrieve current location.');
      return null;
    }
  };

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
  };

  const fetchWeather = useCallback(async (lat: number, lng: number): Promise<WeatherData> => {
    try {
      const response = await fetch(
        `http://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${lat},${lng}&aqi=no`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        name: data.location.name,
        region: data.location.region,
        country: data.location.country,
        temp_c: data.current.temp_c,
        feels_like: data.current.feelslike_c,
        icon: data.current.condition.icon,
        condition: data.current.condition.text,
        humidity: data.current.humidity,
        dewpoint: data.current.dewpoint_c,
        heatindex: data.current.heatindex_c,
        isday: data.current.is_day,
        precip: data.current.precip_in,
        pressure: data.current.pressure_mb,
        uv: data.current.uv,
        viskm: data.current.vis_km,
        windchill: data.current.windchill_c,
        cloud: data.current.cloud,
        wind_mph: data.current.wind_mph,
        wind_dir: data.current.wind_dir,
      };
    } catch (err) {
      console.error('Error fetching weather:', err);
      throw err;
    }
  }, []);

  const loadWeatherData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const storedWeather = await AsyncStorage.getItem('weatherData');
      const storedTimestamp = await AsyncStorage.getItem('weatherTimestamp');

      if (storedWeather && storedTimestamp) {
        const parsedWeather = JSON.parse(storedWeather);
        const timestamp = parseInt(storedTimestamp, 10);
        const now = Date.now();

        // If stored data is less than 30 minutes old, use it
        if (now - timestamp < 30 * 60 * 1000) {
          setCurrentWeather(parsedWeather);
          setIsLoading(false);
          return;
        }
      }

      const permissionGranted: any = await requestLocationPermission();
      setHasLocationPermission(permissionGranted);

      if (permissionGranted) {
        const currentLocation = await getCurrentLocation();
        if (currentLocation) {
          setLocation(currentLocation);
          const [lng, lat] = currentLocation.map((coord) => Number(coord.toFixed(6)));
          const weatherData = await fetchWeather(lat, lng);

          if (isMounted.current) {
            setCurrentWeather(weatherData);
            await AsyncStorage.setItem('weatherData', JSON.stringify(weatherData));
            await AsyncStorage.setItem('weatherTimestamp', Date.now().toString());
          }
        } else {
          throw new Error('Unable to retrieve current location');
        }
      } else {
        throw new Error('Location permission denied');
      }
    } catch (err) {
      console.error(err);
      if (isMounted.current) {
        setError('Could not fetch weather information');
        Alert.alert('Error', 'Could not fetch weather information');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [fetchWeather]);

  useEffect(() => {
    loadWeatherData();

    return () => {
      isMounted.current = false;
    };
  }, [loadWeatherData]);

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      setCurrentDate(now);

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();

      setTimeout(updateDate, timeUntilMidnight);
    };

    updateDate();
  }, []);

  const refreshWeather = useCallback(() => {
    loadWeatherData();
  }, [loadWeatherData]);

  return {
    currentWeather,
    location,
    hasLocationPermission,
    isLoading,
    error,
    userTime: formatDate(currentDate),
    refreshWeather,
  };
};

export const useWeatherAnalysis = (weatherData: WeatherData): WeatherAnalysis => {
  const [heatPrediction, setHeatPrediction] = useState<string>('');
  const [rainPrediction, setRainPrediction] = useState<string>('');
  const [uvPrediction, setUvPrediction] = useState<string>('');
  const [windPrediction, setWindPrediction] = useState<string>('');
  const [visibilityPrediction, setVisibilityPrediction] = useState<string>('');

  useEffect(() => {
    if (!weatherData) {
      return;
    }
    const {
      temp_c,
      feels_like,
      humidity,
      cloud,
      wind_mph,
      dewpoint,
      heatindex,
      precip,
      uv,
      viskm,
      wind_dir,
      condition,
    } = weatherData;

    // Combined Heat Analysis: Temp, Feels Like, Heat Index, Condition
    if (feels_like >= 35 || heatindex >= 35) {
      setHeatPrediction('Sunny and scorching!');
    } else if (feels_like >= 29 && feels_like < 35) {
      setHeatPrediction('Warm but cloudy');
    } else if (temp_c >= 29 && feels_like < 35) {
      setHeatPrediction('Clear skies and warm');
    } else {
      setHeatPrediction('Mild weather');
    }

    // Rain/Precipitation Analysis: Dewpoint, Humidity, Cloud Coverage, Condition
    if (precip > 0 || condition.toLowerCase().includes('rain')) {
      setRainPrediction('Possible rain');
    } else if (
      condition.toLowerCase().includes('drizzle') ||
      condition.toLowerCase().includes('showers')
    ) {
      setRainPrediction('Light rain expected');
    } else if (humidity >= 80 && dewpoint > 20 && condition.toLowerCase().includes('storm')) {
      setRainPrediction('Thunderstorms expected');
    } else if (humidity < 50 && cloud < 50 && condition.toLowerCase().includes('clear')) {
      setRainPrediction('Clear skies');
    } else if (humidity >= 50 && humidity < 80 && cloud >= 50) {
      setRainPrediction('Possible light rain');
    } else {
      setRainPrediction('No rain expected');
    }

    // UV Index Prediction
    if (uv < 3) {
      setUvPrediction('Low UV levels');
    } else if (uv >= 3 && uv <= 5) {
      setUvPrediction('Moderate UV Levels');
    } else if (uv > 5) {
      setUvPrediction('High UV levels');
    }

    // Wind Prediction: Wind Speed, Wind Direction
    if (wind_mph > 20) {
      setWindPrediction(` Strong winds`);
    } else if (wind_mph > 10) {
      setWindPrediction(`Moderate winds`);
    } else {
      setWindPrediction(`Gentle winds`);
    }

    // Visibility Prediction: Visibility and General Weather Condition
    if (viskm < 1) {
      setVisibilityPrediction('Low visibility');
    } else if (viskm >= 1 && viskm <= 5) {
      setVisibilityPrediction('Moderate visibility');
    } else {
      setVisibilityPrediction('Clear visibility.');
    }
  }, [weatherData]);

  return {
    heatPrediction,
    rainPrediction,
    uvPrediction,
    windPrediction,
    visibilityPrediction,
  };
};
