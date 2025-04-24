import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import VideoPlayer from './VideoPlayer';
import SideActions from './SideActions';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Campaign, Adtype } from '~/store/api/api';

const { width, height } = Dimensions.get('window');

interface CampaignItemProps {
  item: Campaign;
  index: number;
  currentIndex: number;
  isLastItem: boolean;
  videoRefs: React.MutableRefObject<{ [key: number]: any }>;
  videoPaused: boolean;
  expandedDescription: boolean;
  isLiked: boolean;
  likeCount: number;
  hasJoined: boolean;
  isPendingLike: boolean;
  isPendingJoin: boolean;
  progress: number;
  totalTasks: number;
  isCompleted: boolean;
  onToggleVideo: () => void;
  onToggleDescription: () => void;
  toggleDetailsPanel: () => void;
  onTrophyPress: () => void;
  onWebsitePress: () => void;
  onLikePress: () => void;
  isOffline: boolean;
  userId: string | null;
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
  hasJoined,
  isPendingLike,
  isPendingJoin,
  progress,
  totalTasks,
  isCompleted,
  onToggleVideo,
  onToggleDescription,
  toggleDetailsPanel,
  onTrophyPress,
  onWebsitePress,
  onLikePress,
  isOffline,
  userId,
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

  const isVideo = item.adType === Adtype.VIDEO_ADS;
  const mediaUrl = item.mediaUrl || '';
  const businessName = item.business?.name || item.name?.split(' ')[0] || 'Campaign';
  const campaignName = item.name || 'Campaign';

  // console.log(mediaUrl);

  const renderContent = () => (
    <SafeAreaView style={styles.contentContainer}>
      <View style={[styles.bottomSection, isLastItem && { marginBottom: 80 }]}>
        <View style={styles.businessInfoContainer}>
          <Text style={styles.campaignName}>{campaignName}</Text>
          <View style={styles.businessNameContainer}>
            <Text style={styles.businessName}>{businessName}</Text>
            <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" style={styles.checkmark} />
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
            {!expandedDescription && item.description?.length > 80 && (
              <Text style={styles.moreText}> more</Text>
            )}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleDetailsPanel} style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>Start Task</Text>
        </TouchableOpacity>
      </View>
      <SideActions
        isLiked={isLiked}
        likeCount={likeCount}
        reached={item.reached || 0}
        hasJoined={hasJoined}
        completedTasks={progress}
        totalTasks={totalTasks}
        isCompleted={isCompleted}
        onTrophyPress={onTrophyPress}
        onLikePress={onLikePress}
        onWebsitePress={onWebsitePress}
        isPendingLike={isPendingLike}
        isPendingJoin={isPendingJoin}
        isOffline={isOffline}
      />
    </SafeAreaView>
  );

  if (isVideo) {
    return (
      <View style={styles.campaignContainer}>
        <View style={styles.videoWrapper}>
          <VideoPlayer
            uri={mediaUrl}
            paused={videoPaused}
            index={index}
            onRef={(ref, idx) => {
              videoRefs.current[idx] = ref;
            }}
          />
        </View>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        />
        {renderContent()}
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
    width,
    height,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
    zIndex: 0,
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
    height,
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
    bottom: '10%',
    left: 16,
    width: '75%',
    zIndex: 5,
  },
  businessInfoContainer: {
    marginBottom: 16,
  },
  campaignName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  businessNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  businessName: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  checkmark: {
    marginLeft: 4,
  },
  rewardText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
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
  detailsButton: {
    backgroundColor: '#B71C1C',
    width: '70%',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  detailsButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

export default CampaignItem;
