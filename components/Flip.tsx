import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

interface FlippableCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
}

const FlippableCard: React.FC<FlippableCardProps> = ({ frontContent, backContent }) => {
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useSharedValue(0);

  const handleFlip = () => {
    setFlipped(!flipped);
    flipAnim.value = withTiming(flipped ? 0 : 1, { duration: 900 });
  };

  const frontStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateY: `${flipAnim.value * 180}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateY: `${flipAnim.value * 180 + 180}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, frontStyle]}>{frontContent}</Animated.View>

      <Animated.View style={[styles.card, styles.cardBack, backStyle]}>{backContent}</Animated.View>

      <TouchableOpacity onPress={handleFlip} style={styles.button}>
        <Ionicons name="information-circle-outline" size={32} color="black" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: 220,
    marginTop: 6,
    width: '100%',
  },
  card: {
    width: '100%',
    height: 180,
    backfaceVisibility: 'hidden',
    elevation: 5,
    position: 'absolute',
    flexDirection: 'column',
    backgroundColor: '#A71919',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 6,
  },
  cardBack: {
    backgroundColor: '#A71919',
  },
  button: {
    // marginTop: 20,
    position: 'absolute',
    bottom: -10,
    right: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default FlippableCard;
