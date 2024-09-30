import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';

interface IconCircleProgressProps {
  size?: number;
  progress: number;
  icon: React.ReactNode;
  progressColor?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

const IconCircleProgress: React.FC<IconCircleProgressProps> = ({
  size = 45,
  progress,
  icon,
  progressColor = '#',
  backgroundColor = '#A71919',
  style,
}) => {
  const halfSize = size / 2;
  const progressDegree = (progress / 100) * 360;

  return (
    <View style={[styles.container, style, { width: 40, height: 40 }]}>
      {/* Background Circle */}
      <View
        style={[
          styles.backgroundCircle,
          { borderColor: backgroundColor, width: size, height: size, borderRadius: halfSize },
        ]}
      />
      {/* Progress Arc */}
      <View
        style={[
          styles.progressCircle,
          {
            borderColor: progressColor,
            width: size,
            height: size,
            borderRadius: halfSize,
            transform: [{ rotateZ: `${progressDegree}deg` }],
          },
        ]}
      />
      {/* Icon at the center */}
      <View style={[styles.iconContainer, { width: size, height: size }]}>{icon}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundCircle: {
    position: 'absolute',
    borderWidth: 4,
  },
  progressCircle: {
    position: 'absolute',
    borderWidth: 8,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FF0000',
    transform: [{ rotateZ: '0deg' }],
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default IconCircleProgress;
