import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import VideoPlayer from './VideoPlayer';
import SideActions from './SideActions';

const { width, height } = Dimensions.get('window');

interface CampaignItemProps {
  item: any;
  index: number;
  currentIndex: number;
  isLastItem: boolean;
  videoRefs: React.MutableRefObject<{ [key: number]: any }>;
  videoPaused: boolean;
  expandedDescription: boolean;
  isLiked: boolean;
  likeCount: number;
  followState: { [key: number]: boolean };
  hasJoined: { [key: number]: boolean };
  progress: number;
  totalTasks: number;
  isCompleted: boolean;
  onToggleVideo: (index: number) => void;
  onToggleDescription: () => void;
  onDetailsPress: () => void;
  onTrophyPress: () => void;
  onLikePress: () => void;
  onFollowPress: () => void;
  onWebsitePress?: () => void;
}

const CampaignItem: React.FC<CampaignItemProps> = ({
  item,
  index,
  currentIndex,
  isLastItem,
  videoRefs,
  videoPaused,
  expandedDescription,
  isLiked,
  likeCount,
  followState,
  hasJoined,
  progress,
  totalTasks,
  isCompleted,
  onToggleVideo,
  onToggleDescription,
  onDetailsPress,
  onTrophyPress,
  onLikePress,
  onFollowPress,
  onWebsitePress,
}) => {
  if (!item) {
    return (
      <View style={styles.campaignContainer}>
        <View style={[styles.loadingContainer, { backgroundColor: '#111' }]}>
          <Text style={styles.loadingText}>Error loading campaign</Text>
        </View>
      </View>
    );
  }

  const isVideo = item.adType === 'video_ads';
  const isPaused = videoPaused === true;
  const isFollowing = followState[index] || false;

  // Extract business name
  const businessName =
    item.businessName || item.business?.name || item.name?.split(' ')[0] || 'Campaign';
  const campaignName = item.name || item.business?.name || 'Campaign';

  // Process media URL
  const mediaUrl = item.mediaUrl || '';
  const hasWebsite = !!item.cta?.url;

  const renderContent = () => (
    <SafeAreaView style={styles.contentContainer}>
      <View style={[styles.bottomSection, isLastItem && { marginBottom: 80 }]}>
        <View style={styles.businessInfoContainer}>
          <Text style={styles.campaignName}>{campaignName}</Text>

          <View style={styles.businessRow}>
            <Text style={styles.businessName}>{businessName}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onToggleDescription}
          style={styles.descriptionContainer}>
          <Text
            style={styles.campaignDescription}
            numberOfLines={expandedDescription ? undefined : 2}>
            {item.description}
            {!expandedDescription && item.description.length > 80 && (
              <Text style={styles.moreText}> more</Text>
            )}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDetailsPress} style={styles.startButton}>
          <Text style={styles.startButtonText}>Join Campaign</Text>
        </TouchableOpacity>
      </View>

      {/* Side actions */}
      <SideActions
        isCompleted={isCompleted}
        progress={progress}
        totalTasks={totalTasks}
        isLiked={isLiked}
        likeCount={likeCount}
        isFollowing={isFollowing}
        hasJoined={hasJoined[index] || false}
        onTrophyPress={onTrophyPress}
        onLikePress={onLikePress}
        onFollowPress={onFollowPress}
        onWebsitePress={hasWebsite ? onWebsitePress : undefined}
        showWebsite={hasWebsite}
      />
    </SafeAreaView>
  );

  if (isVideo) {
    return (
      <View style={styles.campaignContainer}>
        <VideoPlayer
          uri={mediaUrl}
          paused={isPaused}
          index={index}
          onRef={(ref, idx) => {
            videoRefs.current[idx] = ref;
          }}
          onTogglePlayback={onToggleVideo}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        />
        <View>{renderContent()}</View>
      </View>
    );
  } else if (mediaUrl) {
    return (
      <View style={styles.campaignContainer}>
        <ImageBackground
          source={{ uri: mediaUrl }}
          style={styles.campaignBackground}
          resizeMode="contain">
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            style={styles.overlay}
          />
          {renderContent()}
        </ImageBackground>
      </View>
    );
  } else {
    return (
      <View style={styles.campaignContainer}>
        <View
          style={[
            styles.campaignBackground,
            { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
          ]}>
          <Text style={styles.loadingText}>Media not available</Text>
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            style={styles.overlay}
          />
          {renderContent()}
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  campaignContainer: {
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '400',
  },
  campaignBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#000',
    width: '100%',
    height: height,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 12,
    zIndex: 2,
  },
  bottomSection: {
    marginBottom: 40,
    position: 'absolute',
    bottom: 24,
    left: 16,
    width: '75%',
    zIndex: 5,
  },
  businessInfoContainer: {
    marginBottom: 16,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  campaignName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  businessName: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  descriptionContainer: {
    marginBottom: 18,
  },
  campaignDescription: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
    letterSpacing: 0.2,
  },
  moreText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  startButton: {
    backgroundColor: '#B71C1C',
    width: '70%',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  startButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

export default CampaignItem;
