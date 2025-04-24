import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated, Easing } from 'react-native';
import { useSelector } from 'react-redux';
import { selectIsConnected, selectConnectionType } from '~/store/slices/isNetworkSlice';
import { selectHasPendingRequests, selectIsSyncing } from '~/store/slices/isApiQueueSlice';
import { FontAwesome } from '@expo/vector-icons';

const NetworkStatusBanner = () => {
  const isConnected = useSelector(selectIsConnected);
  const connectionType = useSelector(selectConnectionType);
  const hasPendingRequests = useSelector(selectHasPendingRequests);
  const isSyncing = useSelector(selectIsSyncing);

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const syncAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0.2)).current;

  // Show or hide the banner based on state
  useEffect(() => {
    if (!isConnected || hasPendingRequests) {
      // Show banner
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 12,
        bounciness: 8,
        useNativeDriver: true,
      }).start();
    } else {
      // Hide banner
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, hasPendingRequests, slideAnim]);

  useEffect(() => {
    if (isSyncing) {
      const spinAnimation = Animated.loop(
        Animated.timing(syncAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      const progressAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 0.7,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(progressAnim, {
            toValue: 0.3,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ])
      );

      spinAnimation.start();
      progressAnimation.start();

      return () => {
        spinAnimation.stop();
        progressAnimation.stop();
      };
    } else {
      Animated.timing(progressAnim, {
        toValue: 0.2,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isSyncing, syncAnim, progressAnim]);

  // If connected and no pending requests, don't render (banner will animate out)
  if (isConnected && !hasPendingRequests && !isSyncing) {
    return null;
  }

  // Determine banner style and content based on status
  let backgroundColor = '#f8d7da'; // Offline default
  let iconName = 'wifi-off';
  let title = 'You are offline';
  let subtitle = 'Changes will sync when connection is restored';

  if (isConnected) {
    return;
  }

  const spin = syncAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate width percentage as a string
  const progressWidthPercent = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[styles.container, { backgroundColor, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.contentContainer}>
        <Animated.View
          style={[styles.iconContainer, isSyncing && { transform: [{ rotate: spin }] }]}>
          <FontAwesome name={'refresh'} size={20} color="black" />
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {(isSyncing || !isConnected) && (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressWidthPercent,
                },
              ]}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 45, // Account for status bar
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999, // Just below your modal
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: '#000000',
    fontSize: 13,
  },
  progressBarContainer: {
    width: '100%',
    height: 3,
    marginTop: 4,
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 1.5,
  },
});

export default NetworkStatusBanner;
