import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';

const PulsingLoadingCard = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: pulseScale }],
          opacity: pulseOpacity,
        },
      ]}>
      <Animated.Text
        style={[
          styles.loadingText,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}>
        Loading data...
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 162,
    backgroundColor: '#A71919',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    overflow: 'hidden',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default PulsingLoadingCard;
