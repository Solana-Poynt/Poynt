import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Mapbox from '@rnmapbox/maps';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_CODE || '');

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_CODE || '';

const FOURSQUARE_API_KEY = 'fsq3Gvr/n2MKj0SfyGug4mtRH6gtgz6kBbSYjGG61JKbnj4=';

// interface MapboxSearchProps {
//   userLocation: [number, number] | any;
// }
interface Place {
  id: string;
  name: string;
  coordinates: [number, number] | number[];
  distance?: number;
}

interface MapboxSearchProps {
  userLocation: [number, number] | number[];
  onPlaceSelect: (place: Place) => void;
}

const MapboxSearch: React.FC<MapboxSearchProps> = ({ userLocation, onPlaceSelect }) => {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);

  useEffect(() => {
    const searchLocation = async () => {
      if (searchText.length > 2 && userLocation) {
        setIsSearching(true);
        setNoResults(false);
        const [lng, lat] = userLocation;
        try {
          const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(searchText)}&ll=${lat},${lng}&limit=10`;
          const options = {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: FOURSQUARE_API_KEY,
            },
          };

          const response = await fetch(url, options);
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            setSuggestions(data.results);
            setNoResults(false);
          } else {
            setSuggestions([]);
            setNoResults(true);
          }
        } catch (error) {
          console.error('Error searching location:', error);
          setSuggestions([]);
          setNoResults(true);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        setNoResults(false);
      }
    };

    const debounce = setTimeout(() => {
      searchLocation();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchText, userLocation]);

  const handleSuggestionPress = (suggestion: any) => {
    setSuggestions([]);
    const placeCoordinates: [number, number] = [
      suggestion.geocodes.main.longitude,
      suggestion.geocodes.main.latitude,
    ];

    onPlaceSelect({
      id: suggestion.name,
      name: suggestion.name,
      coordinates: placeCoordinates,
      distance: suggestion.distance,
    });
  };

  const clearText = () => {
    setSearchText('');
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
        {searchText ? (
          <FontAwesome name="close" size={24} color="#A2A2A2" onPress={clearText} />
        ) : (
          <FontAwesome5 name="microphone" size={22} color="#A2A2A2" />
        )}

        {/*  */}
      </View>

      {isSearching && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="small" color="#A2A2A2" />
          <Text style={styles.searchingText}>Searching...</Text>
        </View>
      )}

      {!isSearching && noResults && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No results found</Text>
        </View>
      )}

      {!isSearching && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.fsq_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSuggestionPress(item)}
                style={styles.suggestionItem}>
                <Text>{item.name}</Text>
                <Text style={styles.suggestionDistance}>{item.distance} m</Text>
              </TouchableOpacity>
            )}
          />
        </View>
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
    borderRadius: 100,
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
    overflow: 'hidden',
  },
  suggestionsContainer: {
    position: 'absolute',
    width: 342,
    marginTop: 10,
    marginLeft: 7,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    maxHeight: 200,
    backgroundColor: 'white',
    elevation: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
    top: 50,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionAddress: {
    fontSize: 12,
    color: '#777',
  },
  selectedPlaceContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
  },
  selectedPlaceTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    position: 'absolute',
    width: 342,
    marginLeft: 7,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    maxHeight: 200,
    backgroundColor: 'white',
    elevation: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
    top: 50,
  },
  searchingText: {
    marginLeft: 10,
    fontSize: 16,
  },
  noResultsContainer: {
    alignItems: 'center',
    marginTop: 10,
    position: 'absolute',
    width: 342,
    marginLeft: 7,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    maxHeight: 200,
    backgroundColor: 'white',
    elevation: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
    top: 50,
  },
  noResultsText: {
    fontSize: 16,
    color: '#777',
  },
  suggestionDistance: {
    fontSize: 12,
    color: '#777',
  },
});

export default MapboxSearch;
