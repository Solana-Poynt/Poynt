import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const innerDimension = 300;

export const Overlay = () => {
  return (
    <View style={styles.container}>
      {/* Top rectangle */}
      <View style={styles.topRect} />

      {/* Middle row with left, center (transparent), and right */}
      <View style={styles.middleRow}>
        <View style={styles.leftRect} />
        <View style={styles.transparentCenter} />
        <View style={styles.rightRect} />
      </View>

      {/* Bottom rectangle */}
      <View style={styles.bottomRect} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width,
    height,
    backgroundColor: 'transparent',
  },
  topRect: {
    width: '100%',
    height: (height - innerDimension) / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  middleRow: {
    flexDirection: 'row',
    height: innerDimension,
  },
  leftRect: {
    width: (width - innerDimension) / 2,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  transparentCenter: {
    width: innerDimension,
    height: '100%',
    backgroundColor: 'transparent',
  },
  rightRect: {
    width: (width - innerDimension) / 2,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomRect: {
    width: '100%',
    height: (height - innerDimension) / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
