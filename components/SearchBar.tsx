import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import Mapbox from '@rnmapbox/maps';
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_CODE || '');

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
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const searchLocation = async () => {
      if (searchText.length > 2 && userLocation) {
        setIsSearching(true);
        setNoResults(false);
        const [lng, lat] = userLocation.map((coord) => Number(coord.toFixed(6)));

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
    closeSearchModal();
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

  const closeSearchModal = () => {
    setIsModalVisible(false);
    setSearchText('');
    setSuggestions([]);
    setNoResults(false);
  };

  const openSearchModal = () => {
    setIsModalVisible(true);
  };

  const clearText = () => {
    setSearchText('');
    setSuggestions([]);
    setNoResults(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={openSearchModal} style={styles.searchBar}>
        <View style={styles.firstContainer}>
          <FontAwesome5 name="search" size={22} color="#A2A2A2" />
          <Text style={styles.searchBarText}>Search Places, Locations ...</Text>
        </View>
        <FontAwesome5 name="microphone" size={22} color="#A2A2A2" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.searchInputContainer}>
              <TouchableOpacity onPress={closeSearchModal} style={styles.closeButton}>
                <Ionicons name="arrow-back-outline" size={23} color="#A2A2A2" />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Search Places, Locations ..."
                value={searchText}
                onChangeText={(text) => setSearchText(text)}
                autoFocus
              />
              {searchText ? (
                <TouchableOpacity onPress={clearText}>
                  <FontAwesome name="close" size={24} color="#A2A2A2" />
                </TouchableOpacity>
              ) : (
                <FontAwesome5 name="microphone" size={22} color="#A2A2A2" />
              )}
            </View>
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
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 100,
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 18,
    paddingLeft: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  firstContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'space-between',
  },
  searchBarText: {
    marginLeft: 10,
    color: '#A2A2A2',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  closeButton: {
    padding: 5,
  },
  searchingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  searchingText: {
    marginLeft: 10,
    fontSize: 16,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#777',
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  suggestionDistance: {
    fontSize: 12,
    color: '#777',
  },
});

export default MapboxSearch;
