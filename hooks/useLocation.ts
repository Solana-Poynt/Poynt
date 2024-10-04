import { useState, useEffect, useCallback, useRef } from 'react';
// import { locationManager } from '@rnmapbox/maps';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '~/utils/Permissions';
import { API_KEY } from '@env';

// const API_KEY = process.env.EXPO_APP_API_KEY;

import * as Location from 'expo-location';
const CACHE_DURATION = 30 * 60 * 1000;

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
  gustkph: number;
  windchill: number;
  icon: string;
  humidity: number;
  cloud: number;
  windkph: number;
  windmph: number;
  wind_dir: string;
}

interface WeatherAnalysis {
  heatPrediction: string;
  rainPrediction: string;
  uvPrediction: string;
  windPrediction: string;
  visibilityPrediction: string;
  extremePrediction: string;
}
interface WeatherState {
  currentWeather: WeatherData | any;
  location: [number, number] | null;
  hasLocationPermission: boolean;
  isLoading: boolean;
  error: string | null;
  userTime: string;
}
export const useWeatherInfo = () => {
  const [weatherState, setWeatherState] = useState<WeatherState>({
    currentWeather: null,
    location: null,
    hasLocationPermission: false,
    isLoading: true,
    error: null,
    userTime: '',
  });
  const isMounted = useRef(true);

  const getCurrentLocation = useCallback(async (): Promise<[number, number] | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({});
      return [location.coords.longitude, location.coords.latitude];
    } catch (err) {
      console.error('Error fetching location:', err);
      return null;
    }
  }, []);

  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const fetchWeather = useCallback(async (lat: number, lng: number): Promise<WeatherData> => {
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${lat},${lng}&aqi=no`
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
      condition: data?.current?.condition?.text,
      dewpoint: data.current.dewpoint_c,
      heatindex: data.current.heatindex_c,
      isday: data.current.is_day,
      precip: data.current.precip_mm,
      pressure: data.current.pressure_mb,
      uv: data.current.uv,
      viskm: data.current.vis_km,
      windchill: data.current.windchill_c,
      icon: data.current.condition.icon,
      humidity: data.current.humidity,
      cloud: data.current.cloud,
      windkph: data.current.wind_kph,
      windmph: data.current.wind_mph,
      wind_dir: data.current.wind_dir,
      gustkph: data.current.gust_kph,
    };
  }, []);

  const loadWeatherData = useCallback(async () => {
    setWeatherState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check for cached data
      const cachedData = await AsyncStorage.getItem('weatherCache');
      if (cachedData) {
        const { timestamp, weather, location } = JSON.parse(cachedData);
        // Check if cache is fresh
        if (Date.now() - timestamp < CACHE_DURATION) {
          setWeatherState((prev) => ({
            ...prev,
            hasLocationPermission: true,
            currentWeather: weather,
            location,
            isLoading: false,
            userTime: formatDate(new Date()),
          }));
          return;
        }
      }

      // Fetch current location
      const currentLocation = await getCurrentLocation();
      if (!currentLocation) {
        throw new Error('Unable to retrieve current location');
      }

      const [lng, lat] = currentLocation;
      // Fetch weather data
      const weatherData = await fetchWeather(lat, lng);

      if (isMounted.current) {
        const newState = {
          currentWeather: weatherData,
          location: currentLocation,
          hasLocationPermission: true,
          isLoading: false,
          error: null,
          userTime: formatDate(new Date()),
        };
        setWeatherState(newState);

        // Cache weather data
        await AsyncStorage.setItem(
          'weatherCache',
          JSON.stringify({
            timestamp: Date.now(),
            weather: weatherData,
            location: currentLocation,
          })
        );
      }
    } catch (err) {
      console.error('Error loading weather data:', err);
      if (isMounted.current) {
        setWeatherState((prev) => ({
          ...prev,
          error: 'Could not fetch weather information',
          isLoading: false,
        }));
      }
    }
  }, [fetchWeather, getCurrentLocation, formatDate]);

  useEffect(() => {
    loadWeatherData();
    const dateInterval = setInterval(() => {
      setWeatherState((prev) => ({ ...prev, userTime: formatDate(new Date()) }));
    }, 3600000);

    return () => {
      isMounted.current = false;
      clearInterval(dateInterval);
    };
  }, [loadWeatherData, formatDate]);

  const refreshWeather = useCallback(() => {
    loadWeatherData();
  }, [loadWeatherData]);

  return { ...weatherState, refreshWeather };
};

export const useWeatherAnalysis = (weatherData: WeatherData): WeatherAnalysis => {
  const [heatPrediction, setHeatPrediction] = useState<string>('');
  const [rainPrediction, setRainPrediction] = useState<string>('');
  const [uvPrediction, setUvPrediction] = useState<string>('');
  const [windPrediction, setWindPrediction] = useState<string>('');
  const [visibilityPrediction, setVisibilityPrediction] = useState<string>('');
  const [extremePrediction, setExtremePrediction] = useState<string>('');

  const { location } = useWeatherInfo();

  useEffect(() => {
    if (!weatherData) return;

    const {
      temp_c,
      feels_like,
      humidity,
      cloud,
      windmph,
      windkph,
      dewpoint,
      heatindex,
      precip,
      uv,
      viskm,
      wind_dir,
      condition,
      pressure,
      gustkph,
      country,
    } = weatherData;

    const [lng, lat] = location ?? [0, 0];

    // Dynamic regional classification
    const isHotRegion = (avgTemp: number): boolean => avgTemp > 25;
    const isColdRegion = (avgTemp: number): boolean => avgTemp < 10;
    // const isTropicalRegion = (): boolean => Math.abs(lat) < 23.5;

    const avgTemp = (temp_c + feels_like) / 2;

    const checkCondition = (keywords: string[]): boolean =>
      keywords.some((keyword) => condition.toLowerCase().includes(keyword));

    // Heat Analysis
    if (heatindex >= 54) {
      setHeatPrediction(checkCondition(['sunny', 'clear']) ? 'Extreme heat' : 'Heat danger');
    } else if (heatindex >= 41) {
      setHeatPrediction(checkCondition(['sunny', 'clear']) ? 'Very hot' : 'Heat risk');
    } else if (heatindex >= 32) {
      setHeatPrediction(checkCondition(['sunny', 'clear']) ? 'Hot' : 'Heat alert');
    } else if (feels_like >= 35 || heatindex >= 27) {
      setHeatPrediction(isHotRegion(avgTemp) ? 'Typical heat' : 'Warm');
    } else if (temp_c >= 30) {
      setHeatPrediction(checkCondition(['cloudy', 'overcast']) ? 'Warm cloudy' : 'Warm');
    } else if (temp_c >= 20 && temp_c < 30) {
      setHeatPrediction(checkCondition(['rain', 'drizzle']) ? 'Mild wet' : 'Mild');
    } else if (temp_c >= 10 && temp_c < 20) {
      setHeatPrediction(isColdRegion(avgTemp) ? 'Mild here' : 'Cool');
    } else if (temp_c >= 0 && temp_c < 10) {
      setHeatPrediction(isColdRegion(avgTemp) ? 'Typical cold' : 'Cold');
    } else if (temp_c >= -10 && temp_c < 0) {
      setHeatPrediction('Very cold');
    } else {
      setHeatPrediction('Freezing');
    }

    // Rain Analysis
    if (precip > 50) {
      setRainPrediction('Heavy rain');
    } else if (precip > 10) {
      setRainPrediction('Moderate rain');
    } else if (precip > 0 || checkCondition(['rain', 'drizzle', 'showers'])) {
      setRainPrediction('Light rain');
    } else if (humidity >= 80 && dewpoint > 20 && checkCondition(['storm'])) {
      setRainPrediction('Thunderstorms');
    } else if (humidity >= 70 && cloud > 70) {
      setRainPrediction('Rain likely');
    } else if (humidity < 40 && cloud < 30) {
      setRainPrediction('Dry');
    } else {
      setRainPrediction('No rain');
    }

    // UV Index Prediction
    if (uv >= 11) {
      setUvPrediction('Extreme UV');
    } else if (uv >= 8) {
      setUvPrediction('Very high UV');
    } else if (uv >= 6) {
      setUvPrediction('High UV');
    } else if (uv >= 3) {
      setUvPrediction('Moderate UV');
    } else {
      setUvPrediction('Low UV');
    }

    // Wind Prediction
    const windSpeed = Math.max(windkph, gustkph);
    if (windSpeed >= 118) {
      setWindPrediction(`Hurricane ${wind_dir}`);
    } else if (windSpeed >= 89) {
      setWindPrediction(`Storm ${wind_dir}`);
    } else if (windSpeed >= 62) {
      setWindPrediction(`Gale ${wind_dir}`);
    } else if (windSpeed >= 39) {
      setWindPrediction(`Strong ${wind_dir}`);
    } else if (windSpeed >= 20) {
      setWindPrediction(`Breezy ${wind_dir}`);
    } else {
      setWindPrediction(`Light ${wind_dir}`);
    }

    // Visibility Prediction
    if (viskm < 0.05) {
      setVisibilityPrediction('Dense fog');
    } else if (viskm < 0.5) {
      setVisibilityPrediction('Thick fog');
    } else if (viskm < 1) {
      setVisibilityPrediction('Fog');
    } else if (viskm < 2) {
      setVisibilityPrediction('Poor');
    } else if (viskm < 5) {
      setVisibilityPrediction('Moderate');
    } else {
      setVisibilityPrediction('Good');
    }

    // Extreme Weather Prediction
    const extremeConditions = [];
    if (heatindex >= 54) extremeConditions.push('Extreme heat');
    if (temp_c <= -20) extremeConditions.push('Extreme cold');
    if (windSpeed >= 118) extremeConditions.push('Hurricane');
    if (precip > 50) extremeConditions.push('Heavy rain');
    if (viskm < 0.05) extremeConditions.push('Dense fog');
    if (checkCondition(['tornado', 'cyclone'])) extremeConditions.push('Tornado risk');
    if (pressure < 950) extremeConditions.push('Very low pressure');

    setExtremePrediction(extremeConditions.length > 0 ? extremeConditions.join(', ') : 'None');
  }, [weatherData]);

  return {
    heatPrediction,
    rainPrediction,
    uvPrediction,
    windPrediction,
    visibilityPrediction,
    extremePrediction,
  };
};
