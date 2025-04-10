import AsyncStorage from '@react-native-async-storage/async-storage';

// Function to store a string value in AsyncStorage
export const saveDataToAsyncStorage = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
    console.log(`Successfully saved data for key: ${key}`);
  } catch (error) {
    console.error(`Error saving data for key: ${key}`, error);
    throw error;
  }
};

// Function to retrieve a string value from AsyncStorage
export const getDataFromAsyncStorage = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value;
  } catch (error) {
    console.error(`Error retrieving data for key: ${key}`, error);
    throw error;
  }
};

// Function to delete a value from AsyncStorage
export const deleteDataFromAsyncStorage = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`Successfully deleted data for key: ${key}`);
  } catch (error) {
    console.error(`Error deleting data for key: ${key}`, error);
    throw error;
  }
};

// Function to store a JSON object in AsyncStorage
export const saveJSONToAsyncStorage = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    console.log(`Successfully saved JSON data for key: ${key}`);
  } catch (error) {
    console.error(`Error saving JSON data for key: ${key}`, error);
    throw error;
  }
};

// Function to retrieve a JSON object from AsyncStorage
export const getJSONFromAsyncStorage = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue === null) {
      return null;
    }
    return JSON.parse(jsonValue);
  } catch (error) {
    console.error(`Error retrieving JSON data for key: ${key}`, error);
    throw error;
  }
};

// Function to check if a key exists in AsyncStorage
export const keyExistsInAsyncStorage = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value !== null;
  } catch (error) {
    console.error(`Error checking if key exists: ${key}`, error);
    throw error;
  }
};

// Clear all data from AsyncStorage
export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    console.log('All data cleared from AsyncStorage');
  } catch (error) {
    console.error('Error clearing all data from AsyncStorage', error);
    throw error;
  }
};

// Get all keys from AsyncStorage
export const getAllKeys = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys;
  } catch (error) {
    console.error('Error getting all keys from AsyncStorage', error);
    throw error;
  }
};

// Multi-get items from AsyncStorage
export const getMultipleItems = async (keys) => {
  try {
    const results = await AsyncStorage.multiGet(keys);
    const data = {};

    results.forEach(([key, value]) => {
      data[key] = value;
    });

    return data;
  } catch (error) {
    console.error('Error getting multiple items from AsyncStorage', error);
    throw error;
  }
};

// Multi-get JSON items from AsyncStorage
export const getMultipleJSONItems = async (keys) => {
  try {
    const results = await AsyncStorage.multiGet(keys);
    const data = {};

    results.forEach(([key, value]) => {
      if (value === null) {
        data[key] = null;
      } else {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = null;
        }
      }
    });

    return data;
  } catch (error) {
    console.error('Error getting multiple JSON items from AsyncStorage', error);
    throw error;
  }
};
