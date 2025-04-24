import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated, Easing, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const NotificationModal = ({
  message = 'New notification received',
  type = 'success', // 'success', 'info', 'warning', 'error'
  duration = 4000, // Auto-dismiss after 4 seconds by default
  onDismiss = () => {},
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(true);

  // Determine colors based on notification type
  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          background: '#2E7D32',
          icon: 'checkmark-circle',
        };
      case 'warning':
        return {
          background: '#F57C00',
          icon: 'warning',
        };
      case 'error':
        return {
          background: '#B71C1C',
          icon: 'alert-circle',
        };
      case 'info':
      default:
        return {
          background: '#0277BD',
          icon: 'information-circle',
        };
    }
  };

  const { background, icon } = getColors();

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      speed: 12,
      bounciness: 8,
      useNativeDriver: true,
    }).start();

    // Subtle pulsing animation for the icon
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    // Auto-dismiss timer
    if (duration > 0) {
      const dismissTimer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => {
        clearTimeout(dismissTimer);
        pulseAnimation.stop();
      };
    }

    return () => {
      pulseAnimation.stop();
    };
  }, [slideAnim, pulseAnim, duration]);

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss();
    });
  };

  const iconScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.05],
  });

  if (!visible) return null;

  return (
    <>
      <StatusBar style="light" />
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: background,
          },
        ]}>
        <View style={styles.contentContainer}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
            <Ionicons name={'alert'} size={24} color="#000000" />
          </Animated.View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{message}</Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={dismiss}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <Ionicons name="close" size={20} color="#000000" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0277BD', // Default color (will be overridden)
    paddingTop: 40, // Account for status bar
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
});

export default NotificationModal;
