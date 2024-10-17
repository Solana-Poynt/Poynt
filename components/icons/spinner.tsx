import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

const LoadingSpinner = ({ message }: { message?: string }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#B71C1C" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

export default LoadingSpinner;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});
