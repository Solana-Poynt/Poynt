import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import ComingSoon from '~/components/coming';

const Details = () => {
  const { name } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Contribute', headerShown: false }} />
      <ComingSoon />
    </View>
  );
};

export default Details;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
