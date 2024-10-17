import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';

const ContributeUser = () => {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Contribute', headerShown: false }} />
      <Text style={styles.title}>Coming Soon!</Text>
      <Text style={styles.message}>
        We’re working hard to bring this feature to you. Stay tuned!
      </Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Notify Me</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ContributeUser;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
