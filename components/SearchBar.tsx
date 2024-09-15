import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Mapbox from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';



Mapbox.setAccessToken(process.env.EXPO_PUBLIC_CODE || '');

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_CODE || '';

const SearchBarWithSuggestions = () => {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);


  useEffect(() => {
    const searchLocation = async () => {
      if (searchText.length > 2) {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&limit=5`
          );
          const data = await response.json();
          setSuggestions(data.features);
        } catch (error) {
          console.error('Error searching location:', error);
        }
      } else {
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(() => {
      searchLocation();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchText]);

  const handleSuggestionPress = (suggestion: any) => {
    setSearchText(suggestion.place_name);
    setSuggestions([]);
  };

  return (
    <View style={styles.searchContainer}>
      <View style={styles.firstContainer}>
        <View style={styles.secondContainer}>
          <FontAwesome5 name="search" size={22} color="#A2A2A2" />
          <TextInput
            style={styles.input}
            placeholder="Search Places, Locations ..."
            value={searchText}
            onChangeText={(text) => setSearchText(text)}
          />
        </View>
        <FontAwesome5 name="microphone" size={22} color="#A2A2A2" />
      </View>

      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSuggestionPress(item)}
              style={styles.suggestionItem}>
              <Text>{item.place_name}</Text>
            </TouchableOpacity>
          )}
          style={styles.suggestionsContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: 358,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    position: 'absolute',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
    top: 50,
    left: 16,
    right: 16,
  },
  firstContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    fontSize: 16,
    width: 202,
    borderColor: '#ccc',
    color: '#A2A2A2',
    fontStyle: 'normal',
    lineHeight: 24,
    overflow: "hidden",
  },
  suggestionsContainer: {
    marginTop: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default SearchBarWithSuggestions;