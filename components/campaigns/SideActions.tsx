import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSharedValue,  withTiming } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { selectSyncErrors } from '~/store/slices/isApiQueueSlice';

interface SideActionsProps {
  isLiked: boolean;
  likeCount: number;
  reached: number;
  hasJoined: boolean;
  completedTasks: number;
  totalTasks: number;
  isCompleted: boolean;
  onTrophyPress: () => void;
  onLikePress: () => void;
  onWebsitePress?: () => void;
  showWebsite?: boolean;
  isPendingLike: boolean;
  isPendingJoin: boolean;
  isOffline: boolean;
}

const SideActions: React.FC<SideActionsProps> = ({
  isLiked,
  likeCount,
  reached,
  hasJoined,
  completedTasks = 0,
  totalTasks = 0,
  isCompleted,
  onTrophyPress,
  onLikePress,
  onWebsitePress,
  showWebsite = true,
  isPendingLike,
  isPendingJoin,
  isOffline,
}) => {
  const syncErrors = useSelector(selectSyncErrors);
  const hasLikeError = Object.values(syncErrors).some((error) => error.includes('like'));
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const handleLikePress = () => {
    onLikePress();
    if (!isLiked && !isPendingLike) {
      scale.value = withTiming(1, { duration: 500 });
      opacity.value = withTiming(1, { duration: 500 });
    }
  };

  return (
    <View style={styles.sideActionsContainer}>
      <TouchableOpacity
        style={[styles.sideActionButton, (isPendingJoin || isOffline) && styles.disabledButton]}
        onPress={onTrophyPress}
        disabled={isPendingJoin || isOffline}>
        {isPendingJoin ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Ionicons
            name={hasJoined ? 'trophy' : 'trophy-outline'}
            size={28}
            color={hasJoined ? '#B71C1C' : 'white'}
          />
        )}
        <View style={styles.progressDots}>
          {[1, 2, 3].map((dot) => (
            <View
              key={dot}
              style={[
                styles.progressDot,
                dot <= completedTasks && totalTasks >= dot
                  ? styles.progressDotFilled
                  : styles.progressDotEmpty,
              ]}
            />
          ))}
        </View>
        <Text style={styles.sideActionText}>
          {hasJoined ? (isCompleted ? 'Completed' : `${completedTasks}/${totalTasks}`) : 'Join'}
        </Text>
      </TouchableOpacity>

      <View style={styles.sideActionButton}>
        <TouchableOpacity
          style={[(isPendingLike || isOffline) && styles.disabledButton]}
          onPress={handleLikePress}
          disabled={isPendingLike || isOffline}>
          {isPendingLike ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? '#B71C1C' : 'white'}
            />
          )}
        </TouchableOpacity>
        <Text style={styles.sideActionText}>
          {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}
        </Text>
        {hasLikeError && !isPendingLike && (
          <Text style={styles.errorText}>Like failed. Tap to retry.</Text>
        )}
      </View>

      {showWebsite && onWebsitePress && (
        <TouchableOpacity
          style={[styles.sideActionButton, isOffline && styles.disabledButton]}
          onPress={onWebsitePress}
          disabled={isOffline}>
          <Ionicons name="globe-outline" size={28} color="white" />
          <Text style={styles.sideActionText}>Website</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sideActionsContainer: {
    position: 'absolute',
    right: 10,
    bottom: 140,
    alignItems: 'center',
    zIndex: 0,
  },
  sideActionButton: {
    alignItems: 'center',
    marginBottom: 22,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sideActionText: {
    color: 'white',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  progressDots: {
    flexDirection: 'row',
    marginTop: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  progressDotFilled: {
    backgroundColor: '#B71C1C',
  },
  progressDotEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default SideActions;
