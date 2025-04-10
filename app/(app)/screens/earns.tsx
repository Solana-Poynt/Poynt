import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import ComingSoon from '~/components/coming';

const Earns = () => {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Contribute', headerShown: false }} />
      <ComingSoon />
    </View>
  );
};

export default Earns

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
