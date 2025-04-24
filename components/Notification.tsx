import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NotificationProps = {
  message: string;
  status: 'error' | 'success' | 'info' | string;
  switchShowOff: () => void;
};

const { width } = Dimensions.get('window');

const Notification: React.FC<NotificationProps> = ({ message, status, switchShowOff }) => {
  const translateY = useState(new Animated.Value(100))[0];
  const opacity = useState(new Animated.Value(0))[0];

  // Set colors and icons based on status
  const getNotificationStyles = () => {
    switch (status) {
      case 'error':
        return {
          backgroundColor: '#FFEBEE',
          iconColor: '#B71C1C',
          textColor: '#B71C1C',
          borderColor: '#B71C1C',
          icon: 'alert-circle',
        };
      case 'success':
        return {
          backgroundColor: '#E8F5E9',
          iconColor: '#1B5E20',
          textColor: '#1B5E20',
          borderColor: '#1B5E20',
          icon: 'checkmark-circle',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#E1F5FE',
          iconColor: '#0277BD',
          textColor: '#0277BD',
          borderColor: '#0277BD',
          icon: 'information-circle',
        };
    }
  };

  const styles = getNotificationStyles();

  // Animate in
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 4.5 seconds
    const timeoutId = setTimeout(() => {
      hideNotification();
    }, 4500);

    return () => clearTimeout(timeoutId);
  }, []);

  // Animate out
  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      switchShowOff();
    });
  };

  return (
    <Animated.View
      style={[
        componentStyles.container,
        {
          backgroundColor: styles.backgroundColor,
          borderColor: styles.borderColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}>
      <View style={componentStyles.contentContainer}>
        <View style={[componentStyles.iconContainer, { backgroundColor: `${styles.iconColor}20` }]}>
          <Ionicons name="alert" size={24} color={styles.iconColor} />
        </View>

        <Text style={[componentStyles.messageText, { color: styles.textColor }]}>{message}</Text>

        <TouchableOpacity
          style={componentStyles.closeButton}
          onPress={hideNotification}
          hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Ionicons name="close" size={16} color={styles.textColor} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[componentStyles.timerBar, { backgroundColor: styles.borderColor }]} />
    </Animated.View>
  );
};

export default Notification;

const componentStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderLeftWidth: 4,
    overflow: 'hidden',
    zIndex: 9999,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
  timerBar: {
    height: 4,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
