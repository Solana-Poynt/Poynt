import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CircularRatingProps {
  rating: number;
  size?: number;
  baseColor?: string;
  fillColor?: string;
}

const CircularRating: React.FC<CircularRatingProps> = ({
  rating,
  size = 40,
  baseColor = '#e0e0e0',
  fillColor = '#B71C1C',
}) => {
  const normalizedRating = Math.min(Math.max(rating, 1), 5);
  const percentage = ((normalizedRating - 1) / 4) * 100; // Map 1-5 to 0-100%
  const colorIntensity = (normalizedRating - 1) / 4; // Map 1-5 to 0-1 for color intensity

  const interpolateColor = (color: string, factor: number): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const interpolatedR = Math.round(r + (255 - r) * (1 - factor));
    const interpolatedG = Math.round(g + (255 - g) * (1 - factor));
    const interpolatedB = Math.round(b + (255 - b) * (1 - factor));

    return `#${interpolatedR.toString(16).padStart(2, '0')}${interpolatedG.toString(16).padStart(2, '0')}${interpolatedB.toString(16).padStart(2, '0')}`;
  };

  const currentFillColor = interpolateColor(fillColor, colorIntensity);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[styles.backgroundCircle, { width: size, height: size, borderColor: baseColor }]}
      />
      <View
        style={[
          styles.ratingArc,
          {
            width: size,
            height: size,
            transform: [{ rotateZ: '270deg' }],
          },
        ]}>
        <View
          style={[
            styles.ratingFill,
            {
              width: '100%',
              height: '100%',
              transform: [{ rotateZ: `${percentage * 3.6}deg` }],
              borderColor: currentFillColor,
            },
          ]}
        />
      </View>
      <Text style={styles.ratingText}>{normalizedRating.toFixed(1)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 3,
  },
  ratingArc: {
    position: 'absolute',
    borderRadius: 1000,
    overflow: 'hidden',
  },
  ratingFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 1000,
    borderWidth: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default CircularRating;
