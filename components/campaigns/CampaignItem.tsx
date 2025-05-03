import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Platform,
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
  isVisible: boolean;
  isNext: boolean;
  isPreloading?: boolean;
  registerVideoRef?: (ref: any) => void;  // Add these two props
  markVideoReady?: () => void;
}

const CampaignItem: React.FC<CampaignItemProps> = memo(
  ({
    item,
    index,
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
    onToggleDescription,
    toggleDetailsPanel,
    onTrophyPress,
    onWebsitePress,
    onLikePress,
    isOffline,
    isVisible,
    isNext,
    isPreloading = false,
    registerVideoRef,
    markVideoReady,
  }) => {
    const contentRef = useRef<View>(null);
    const hasVideoLoaded = useRef<boolean>(false);

    // Track when this component first becomes visible
    useEffect(() => {
      if (isVisible && !hasVideoLoaded.current) {
        hasVideoLoaded.current = true;
      }
    }, [isVisible]);

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

    // Updated handler for video references
    const handleVideoRef = (ref: any, idx: number) => {
      if (ref) {
        // Use the old method for backward compatibility
        videoRefs.current[idx] = ref;
        
        // Use the new method if available
        if (registerVideoRef) {
          registerVideoRef(ref);
        }
      }
    };

    const renderContent = () => (
      <SafeAreaView
        style={[styles.contentContainer, isLastItem && { marginBottom: 60 }]}
        pointerEvents="box-none"
        ref={contentRef}>
        <View style={[styles.bottomSection]}>
          <View style={styles.businessInfoContainer}>
            <Text style={styles.campaignName} numberOfLines={1} ellipsizeMode="tail">
              {campaignName}
            </Text>
            <View style={styles.businessNameContainer}>
              <Text style={styles.businessName} numberOfLines={1} ellipsizeMode="tail">
                {businessName}
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color="#1DA1F2"
                style={styles.checkmark}
              />
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
          <TouchableOpacity
            onPress={toggleDetailsPanel}
            style={styles.detailsButton}
            activeOpacity={0.7}>
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
              onRef={handleVideoRef}
              isVisible={isVisible}
              isNext={isNext}
              isPreloading={isPreloading}
              markVideoReady={markVideoReady}
            />
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.overlay}
            pointerEvents="none"
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
            resizeMode="contain"
            // Enhanced image loading properties
            fadeDuration={isVisible ? 300 : 0} // Fade in when visible
            progressiveRenderingEnabled={true} // Progressive jpeg rendering
            onLoadStart={() => {
              // Track image load start time if needed
            }}
            onLoadEnd={() => {
              // Track image load complete if needed
              // Mark image as ready for parent component if available
              if (markVideoReady) {
                markVideoReady();
              }
            }}>
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
              style={styles.overlay}
              pointerEvents="none"
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
              pointerEvents="none"
            />
            {renderContent()}
          </View>
        </View>
      );
    }
  },
  // Enhanced memoization comparison function
  (prevProps, nextProps) => {
    // Check crucial props for performance

    // Always re-render when visibility changes
    if (prevProps.isVisible !== nextProps.isVisible) return false;

    // Always re-render when preloading status changes
    if (prevProps.isPreloading !== nextProps.isPreloading) return false;

    // Always re-render when the item changes
    if (prevProps.item.id !== nextProps.item.id) return false;

    // Always re-render when expanded state changes
    if (prevProps.expandedDescription !== nextProps.expandedDescription) return false;

    // Always re-render when progress changes
    if (prevProps.progress !== nextProps.progress) return false;

    // Always re-render when completion changes
    if (prevProps.isCompleted !== nextProps.isCompleted) return false;

    // Always re-render when like/join state changes
    if (
      prevProps.isLiked !== nextProps.isLiked ||
      prevProps.hasJoined !== nextProps.hasJoined ||
      prevProps.isPendingLike !== nextProps.isPendingLike ||
      prevProps.isPendingJoin !== nextProps.isPendingJoin
    )
      return false;

    // Otherwise, consider the component unchanged
    return true;
  }
);

// Enhanced styles with optimizations
const styles = StyleSheet.create({
  campaignContainer: {
    width,
    height,
    backgroundColor: '#000',
    // Add hardware acceleration hints
    ...Platform.select({
      android: {
        elevation: 0,
        overflow: 'hidden',
      },
      ios: {
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { height: 0, width: 0 },
      },
    }),
  },
  videoWrapper: {
    flex: 1,
    zIndex: 0,
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
    zIndex: 10,
  },
  bottomSection: {
    marginBottom: 6,
    position: 'absolute',
    bottom: '13%',
    left: 16,
    width: '75%',
    zIndex: 5,
  },
  businessInfoContainer: {
    marginBottom: 18,
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
    maxWidth: '90%',
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
    marginBottom: 20,
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