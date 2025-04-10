import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface SideActionsProps {
  isCompleted: boolean;
  progress: number;
  totalTasks: number;
  isLiked: boolean;
  likeCount: number;
  isFollowing: boolean;
  hasJoined: boolean;
  onTrophyPress: () => void;
  onLikePress: () => void;
  onFollowPress: () => void;
  onWebsitePress?: () => void;
  showWebsite?: boolean;
}

const SideActions: React.FC<SideActionsProps> = ({
  isCompleted,
  progress,
  totalTasks,
  isLiked,
  likeCount,
  isFollowing,
  hasJoined,
  onTrophyPress,
  onLikePress,
  onFollowPress,
  onWebsitePress,
  showWebsite = false,
}) => {
  return (
    <View style={styles.sideActionsContainer}>
      <TouchableOpacity style={styles.sideActionButton} onPress={onTrophyPress}>
        <View style={styles.trophyContainer}>
          <Ionicons
            name={isCompleted ? 'trophy' : 'trophy-outline'}
            size={28}
            color={isCompleted ? '#B71C1C' : 'white'}
          />
        </View>
        <Text style={styles.sideActionText}>
          {progress}/{totalTasks}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.sideActionButton} onPress={onLikePress}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={28}
          color={isLiked ? '#B71C1C' : 'white'}
        />
        <Text style={styles.sideActionText}>
          {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.sideActionButton} onPress={onFollowPress}>
        {isFollowing ? (
          <Ionicons name="person" size={28} color="white" />
        ) : (
          <View style={styles.plusIconContainer}>
            <Ionicons name="person-outline" size={24} color="white" />
            <Ionicons name="add" size={16} color="white" style={styles.plusIcon} />
          </View>
        )}
        <Text style={styles.sideActionText}>{isFollowing ? 'Following' : 'Follow'}</Text>
      </TouchableOpacity>

      {showWebsite && onWebsitePress && (
        <TouchableOpacity style={styles.sideActionButton} onPress={onWebsitePress}>
          <View style={styles.plusIconContainer}>
            <Ionicons name="globe-outline" size={24} color="white" />
          </View>
          <Text style={styles.sideActionText}>Website</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sideActionsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    alignItems: 'center',
    zIndex: 4,
  },
  sideActionButton: {
    alignItems: 'center',
    marginBottom: 22,
  },
  sideActionText: {
    color: 'white',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  trophyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 52,
    height: 52,
  },
  plusIconContainer: {
    position: 'relative',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#B71C1C',
    borderRadius: 8,
    width: 16,
    height: 16,
    textAlign: 'center',
    lineHeight: 16,
    overflow: 'hidden',
  },
});

export default SideActions;
