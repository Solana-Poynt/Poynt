import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, View, Image } from 'react-native';
import Map from '~/components/Map';
import Mapbox from '@rnmapbox/maps';

const Home: React.FC = () => {
  return (
    <>
      <Stack.Screen options={{ title: 'Home', headerShown: false }} />
      <View style={styles.container}>
        <Map />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6E6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingImage: {
    width: 235,
    height: 235,
    resizeMode: 'contain',
    flexShrink: 0,
  },
});

export default Home;
