import AsyncStorage from '@react-native-async-storage/async-storage';

// Save data to AsyncStorage
export const saveDataToAsyncStorage = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

// Get data from AsyncStorage
export const getDataFromAsyncStorage = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value != null ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error retrieving data:', error);
    return null;
  }
};

// Delete data from AsyncStorage
export const deleteDataFromAsyncStorage = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting data:', error);
  }
};
