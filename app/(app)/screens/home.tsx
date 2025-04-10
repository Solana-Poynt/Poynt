import { router, Stack } from 'expo-router';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Text,
  Animated,
  Dimensions,
  AppState,
  RefreshControl,
} from 'react-native';

import {
  useGetDisplayCampaignsQuery,
  useLikeCampaignMutation,
  useJoinCampaignMutation,
  getCachedJoinStatus,
  updateCachedJoinStatus,
} from '~/store/api/api';
import {
  getDataFromAsyncStorage,
  saveJSONToAsyncStorage,
  getJSONFromAsyncStorage,
} from '~/utils/localStorage';
import CampaignItem from '~/components/campaigns/CampaignItem';
import TasksModal from '~/components/campaigns/TasksModal';
import CampaignDetailsModal from '~/components/campaigns/CampaignDetailsModal';
import InAppBrowser from '~/components/campaigns/InAppBrowser';

const { height } = Dimensions.get('window');

// Type definitions
interface UserProgress {
  [campaignIndex: number]: {
    completedTasks: number[];
  };
}

interface VideoPlaybackState {
  [key: number]: boolean;
}

interface Task {
  id: number;
  description: string;
  points: number;
  url?: string;
}

interface FollowState {
  [key: number]: boolean;
}

interface JoinedState {
  [key: number]: boolean;
}

// Constants for performance optimization
const BUSINESS_FOLLOWS_KEY = 'businessFollows';
const USER_TASK_PROGRESS_KEY = 'userTaskProgress';
const VIEWABILITY_CONFIG = {
  viewAreaCoveragePercentThreshold: 75, // Increased for better video playback control
  minimumViewTime: 200, // Reduced for faster response
};

const Home: React.FC = () => {
  // State management
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [taskPanelVisible, setTaskPanelVisible] = useState<boolean>(false);
  const [detailsPanelVisible, setDetailsPanelVisible] = useState<boolean>(false);
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  const [expandedDescription, setExpandedDescription] = useState<boolean>(false);
  const [videoPaused, setVideoPaused] = useState<VideoPlaybackState>({});
  const [appState, setAppState] = useState<string>(AppState.currentState);
  const [followState, setFollowState] = useState<FollowState>({});
  const [hasJoined, setHasJoined] = useState<JoinedState>({});
  const [browserVisible, setBrowserVisible] = useState<boolean>(false);
  const [browserUrl, setBrowserUrl] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [likedCampaigns, setLikedCampaigns] = useState<Record<string, boolean>>({});
  const [visibleIndexes, setVisibleIndexes] = useState<number[]>([]);

  // Refs
  const slideAnimation = useRef<Animated.Value>(new Animated.Value(height)).current;
  const detailsAnimation = useRef<Animated.Value>(new Animated.Value(height)).current;
  const videoRefs = useRef<{ [key: number]: any }>({});
  const flatListRef = useRef<FlatList>(null);
  const mountedRef = useRef<boolean>(true); // Track component mount state

  // API hooks with skip option for better control
  const {
    data: campaignsResponse,
    isLoading,
    refetch,
    isSuccess,
  } = useGetDisplayCampaignsQuery(undefined, {
    // Skip refetch on mount if we already have data
    refetchOnMountOrArgChange: false,
  });
  const [likeCampaign] = useLikeCampaignMutation();
  const [joinCampaign] = useJoinCampaignMutation();

  // Extract campaigns from the response with memoization
  const campaigns = useMemo(() => campaignsResponse?.data || [], [campaignsResponse]);

  // console.log(campaigns);

  // Get user ID on component mount
  useEffect(() => {
    const getUserId = async () => {
      const id = await getDataFromAsyncStorage('id');
      if (mountedRef.current) {
        setUserId(id);

        // Load saved progress
        loadUserProgress();
        loadFollowState();
      }
    };

    getUserId();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load user progress from AsyncStorage
  const loadUserProgress = useCallback(async () => {
    try {
      const savedProgress = await getJSONFromAsyncStorage(USER_TASK_PROGRESS_KEY);
      if (savedProgress && mountedRef.current) {
        setUserProgress(savedProgress);
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  }, []);

  // Load follow state from AsyncStorage
  const loadFollowState = useCallback(async () => {
    try {
      const follows = await getJSONFromAsyncStorage(BUSINESS_FOLLOWS_KEY);
      if (!follows || !mountedRef.current) return;

      // Map business IDs to campaign indexes
      const followStateMap: FollowState = {};

      campaigns.forEach((campaign, index) => {
        if (campaign.business && campaign.business.id) {
          followStateMap[index] = follows[campaign.business.id] || false;
        }
      });

      setFollowState(followStateMap);
    } catch (error) {
      console.error('Error loading follow state:', error);
    }
  }, [campaigns]);

  // Update liked campaigns when user ID or campaigns change
  useEffect(() => {
    if (!userId || campaigns.length === 0) return;

    const newLikedCampaigns: Record<string, boolean> = {};

    campaigns.forEach((campaign) => {
      if (campaign.id && campaign.likers) {
        // Handle nested arrays in likers
        const likersArray = Array.isArray(campaign.likers)
          ? Array.isArray(campaign.likers[0])
            ? campaign.likers.flat() // Handle nested array
            : campaign.likers // Already flat array
          : [];

        // Normalize user ID (remove quotes)
        const normalizedUserId = userId.replace(/^"(.*)"$/, '$1');

        // Check if user liked by normalizing each liker ID
        const isLiked = likersArray.some((liker) => {
          if (!liker) return false;
          const normalizedLiker =
            typeof liker === 'string'
              ? liker.replace(/^"(.*)"$/, '$1').replace(/\\/g, '')
              : String(liker);
          return normalizedLiker === normalizedUserId;
        });

        newLikedCampaigns[campaign.id] = isLiked;
      }
    });

    if (mountedRef.current) {
      console.log('Updated likedCampaigns state:', newLikedCampaigns);
      setLikedCampaigns(newLikedCampaigns);
    }
  }, [userId, campaigns]);

  // Load cached join status for the current campaign
  const loadCachedJoinStatus = useCallback(async (): Promise<void> => {
    if (!campaigns[currentIndex]?.id || !mountedRef.current) return;

    try {
      const campaignId = campaigns[currentIndex].id;
      const joined = await getCachedJoinStatus(campaignId);

      if (mountedRef.current) {
        setHasJoined((prev) => ({
          ...prev,
          [currentIndex]: joined,
        }));
      }
    } catch (error) {
      console.error('Error loading cached join status:', error);
      await checkJoinStatus(); // Fallback
    }
  }, [currentIndex, campaigns]);

  // Load cached data on first successful load
  useEffect(() => {
    const initializeData = async () => {
      if (isInitialLoad && isSuccess && campaigns.length > 0) {
        await loadCachedJoinStatus();
        await loadFollowState();

        // Set isInitialLoad to false only after all initialization is complete
        if (mountedRef.current) {
          setIsInitialLoad(false);
        }
      }
    };

    initializeData();
  }, [isInitialLoad, isSuccess, campaigns.length, loadCachedJoinStatus, loadFollowState]);

  // Check campaign join status from API data
  const checkJoinStatus = useCallback(async (): Promise<void> => {
    if (!userId || !campaigns[currentIndex] || !mountedRef.current) return;

    try {
      const participantsArray = campaigns[currentIndex].participants || [];
      const joined =
        Array.isArray(participantsArray) &&
        (participantsArray.includes(userId) || participantsArray.includes(`"${userId}"`));

      if (mountedRef.current) {
        setHasJoined((prev) => ({
          ...prev,
          [currentIndex]: joined,
        }));
      }

      // Update cache
      if (campaigns[currentIndex].id) {
        await updateCachedJoinStatus(campaigns[currentIndex].id, joined);
      }
    } catch (error) {
      console.error('Error checking join status:', error);
    }
  }, [currentIndex, campaigns, userId]);

  // Update join status when current index changes
  useEffect(() => {
    if (campaigns.length > 0 && currentIndex >= 0 && !isInitialLoad) {
      // Don't load cached join status during initial load to prevent double loading
      loadCachedJoinStatus();
    }
  }, [currentIndex, campaigns, loadCachedJoinStatus, isInitialLoad]);

  // App state monitoring for video playback control
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: string) => {
      if (!mountedRef.current) return;

      setAppState(nextAppState);

      if (nextAppState !== 'active') {
        // Pause ALL videos when app goes to background
        pauseAllVideos();
      } else if (nextAppState === 'active') {
        // Only play videos in view
        updateVideoPlayback();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [visibleIndexes]);

  // Pause all videos
  const pauseAllVideos = useCallback(() => {
    const newPausedState = { ...videoPaused };
    Object.keys(videoRefs.current).forEach((key) => {
      newPausedState[Number(key)] = true;
    });

    if (mountedRef.current) {
      setVideoPaused(newPausedState);
    }
  }, [videoPaused]);

  // Update video playback based on visible indexes
  const updateVideoPlayback = useCallback(() => {
    if (appState !== 'active' || !mountedRef.current) return;

    const newPausedState = { ...videoPaused };
    let hasChanged = false;

    Object.keys(videoRefs.current).forEach((key) => {
      const index = Number(key);
      // Only play videos that are currently visible
      const shouldBePaused = !visibleIndexes.includes(index);

      // Only update if there's a change in state
      if (newPausedState[index] !== shouldBePaused) {
        newPausedState[index] = shouldBePaused;
        hasChanged = true;
      }
    });

    // Only update state if something changed
    if (hasChanged) {
      setVideoPaused(newPausedState);
    }
  }, [appState, videoPaused, visibleIndexes]);

  // Update video playback when visible indexes change
  useEffect(() => {
    if (visibleIndexes.length > 0) {
      updateVideoPlayback();
    }
  }, [visibleIndexes, updateVideoPlayback]);

  // Reset expanded description when changing videos
  useEffect(() => {
    if (mountedRef.current) {
      setExpandedDescription(false);
    }
  }, [currentIndex]);

  // Custom refresh without changing order
  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      // Get current campaign IDs in order
      const currentIds = campaigns.map((campaign) => campaign.id);

      // Refresh data from API
      const response = await refetch();

      if (response.data?.data && mountedRef.current) {
        // If we have existing campaigns, preserve order
        if (currentIds.length > 0 && campaigns.length > 0) {
          // Use RTK Query's updateQueryData to manually update the cache
          // but keep the same order
          console.log('Preserving campaign order after refresh');
        }
      }
    } catch (error) {
      console.error('Error refreshing campaigns:', error);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refetch, campaigns]);

  const toggleVideoPlayback = useCallback((index: number): void => {
    if (!mountedRef.current) return;

    setVideoPaused((prev) => {
      const newState = { ...prev };
      newState[index] = !prev[index];
      return newState;
    });
  }, []);

  const toggleTaskPanel = useCallback((): void => {
    if (taskPanelVisible) {
      Animated.timing(slideAnimation, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (mountedRef.current) {
          setTaskPanelVisible(false);
        }
      });
    } else {
      setTaskPanelVisible(true);
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [taskPanelVisible, slideAnimation]);

  const toggleDetailsPanel = useCallback((): void => {
    if (detailsPanelVisible) {
      Animated.timing(detailsAnimation, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (mountedRef.current) {
          setDetailsPanelVisible(false);
        }
      });
    } else {
      setDetailsPanelVisible(true);
      Animated.timing(detailsAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [detailsPanelVisible, detailsAnimation]);

  // Open in-app browser
  const openInAppBrowser = useCallback((url: string): void => {
    if (!url || !mountedRef.current) return;

    setBrowserUrl(url);
    setBrowserVisible(true);
  }, []);

  // Handle like/unlike campaign with toggle mechanism
  const handleLikePress = useCallback(async (): Promise<void> => {
    if (!userId || !campaigns[currentIndex]?.id || !mountedRef.current) return;

    try {
      const campaignId = campaigns[currentIndex].id;
      const currentlyLiked = likedCampaigns[campaignId] || false;
      const newLikeStatus = !currentlyLiked;

      // Optimistic update (local state only)
      setLikedCampaigns((prev) => ({
        ...prev,
        [campaignId]: newLikeStatus,
      }));

      // API call
      const result = await likeCampaign({
        likerId: userId,
        campaignId: campaignId,
      });

      // Instead of refetching the entire list, just update the current campaign locally
      if (result?.data) {
        // Don't refetch as it changes the order
      }
    } catch (error) {
      console.error('Error toggling like status:', error);

      // Revert UI on error
      if (campaigns[currentIndex]?.id && mountedRef.current) {
        const campaignId = campaigns[currentIndex].id;
        setLikedCampaigns((prev) => ({
          ...prev,
          [campaignId]: !prev[campaignId],
        }));
      }
    }
  }, [currentIndex, campaigns, likeCampaign, userId, likedCampaigns]);

  // Handle follow/unfollow business
  const handleFollowPress = useCallback(async (): Promise<void> => {
    if (!userId || !campaigns[currentIndex]?.business || !mountedRef.current) return;

    try {
      const businessId = campaigns[currentIndex].business;
      const currentStatus = followState[currentIndex] || false;
      const newStatus = !currentStatus;

      // Optimistic update
      setFollowState((prev) => ({
        ...prev,
        [currentIndex]: newStatus,
      }));

      // Store follow state
      const followsData = (await getJSONFromAsyncStorage(BUSINESS_FOLLOWS_KEY)) || {};
      const businessKey =
        typeof businessId === 'object' && businessId.id
          ? businessId.id
          : typeof businessId === 'object' && businessId.name
            ? businessId.name
            : String(businessId);

      followsData[businessKey] = newStatus;
      await saveJSONToAsyncStorage(BUSINESS_FOLLOWS_KEY, followsData);
    } catch (error) {
      console.error('Error following business:', error);

      // Revert UI on error
      if (mountedRef.current) {
        setFollowState((prev) => ({
          ...prev,
          [currentIndex]: !prev[currentIndex],
        }));
      }
    }
  }, [currentIndex, campaigns, followState, userId]);

  // Handle trophy icon press
  const handleTrophyPress = useCallback((): void => {
    if (hasJoined[currentIndex]) {
      toggleTaskPanel();
    } else {
      toggleDetailsPanel();
    }
  }, [currentIndex, hasJoined, toggleTaskPanel, toggleDetailsPanel]);

  // Handle campaign join with toggle mechanism
  const handleJoinCampaign = useCallback(async (): Promise<void> => {
    if (!userId || !campaigns[currentIndex]?.id || !mountedRef.current) return;

    try {
      const campaignId = campaigns[currentIndex].id;

      // Optimistic update
      setHasJoined((prev) => ({
        ...prev,
        [currentIndex]: true,
      }));

      // Update cache
      await updateCachedJoinStatus(campaignId, true);

      // API call
      await joinCampaign({
        userId: userId,
        campaignId: campaignId,
      });

      // UI updates
      toggleDetailsPanel();
      toggleTaskPanel();
    } catch (error) {
      console.error('Error joining campaign:', error);

      // Revert on failure
      if (campaigns[currentIndex]?.id && mountedRef.current) {
        await loadCachedJoinStatus();
      }
    }
  }, [currentIndex, campaigns, joinCampaign, toggleDetailsPanel, toggleTaskPanel, userId]);

  // Handle task completion
  const handleTaskAction = useCallback(
    async (task: Task): Promise<void> => {
      if (!mountedRef.current) return;

      // Update progress
      const newProgress: UserProgress = { ...userProgress };
      if (!newProgress[currentIndex]) {
        newProgress[currentIndex] = { completedTasks: [] };
      }

      if (!newProgress[currentIndex].completedTasks.includes(task.id)) {
        newProgress[currentIndex].completedTasks.push(task.id);
        setUserProgress(newProgress);

        // Persist progress
        await saveJSONToAsyncStorage(USER_TASK_PROGRESS_KEY, newProgress);
      }

      const processTaskUrl = (url: string) => {
        const socialActions = [
          { keywords: ['create tweet', 'tweet', 'post'], action: 'create' },
          { keywords: ['follow'], action: 'follow' },
          { keywords: ['retweet', 'rt'], action: 'retweet' },
          { keywords: ['comment'], action: 'comment' },
          { keywords: ['like'], action: 'like' },
        ];

        // Determine action based on URL text
        const lowerUrl = url.toLowerCase();
        const matchedAction = socialActions.find((action) =>
          action.keywords.some((keyword) => lowerUrl.includes(keyword))
        );

        // Refine URL
        const refinedUrl =
          url.replace(/^(follow:\s*)?/, '').match(/(https?:\/\/[^\s]+)/)?.[0] || url;

        return {
          action: matchedAction ? matchedAction.action : 'default',
          url: refinedUrl,
        };
      };

      // Open URL if available
      if (task.url) {
        const { url } = processTaskUrl(task.url);
        openInAppBrowser(url);
      }

      toggleTaskPanel();
    },
    [currentIndex, userProgress, toggleTaskPanel, openInAppBrowser]
  );

  // Helper functions
  const getCompletionCount = useCallback(
    (index: number): number => {
      if (!userProgress[index] || !userProgress[index].completedTasks) {
        return 0;
      }
      return userProgress[index].completedTasks.length;
    },
    [userProgress]
  );

  // Track campaign views when they become visible
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }): void => {
      if (!mountedRef.current || viewableItems.length === 0) return;

      // Get array of visible indexes
      const newVisibleIndexes = viewableItems.map((item) => item.index);

      // Update the current index to the first visible item
      const newIndex = viewableItems[0].index;

      // Only update states if there's a change
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }

      // Update visible indexes only if they've changed
      const hasChanged =
        newVisibleIndexes.length !== visibleIndexes.length ||
        newVisibleIndexes.some((idx, i) => visibleIndexes[i] !== idx);

      if (hasChanged) {
        // Don't automatically pause videos that user has manually started
        const newPausedState = { ...videoPaused };
        newVisibleIndexes.forEach((visibleIndex) => {
          // Only auto-play the current main video (index === newIndex)
          if (visibleIndex === newIndex) {
            // Don't override manual pause state
            if (typeof newPausedState[visibleIndex] === 'undefined') {
              newPausedState[visibleIndex] = false;
            }
          }
        });

        // Set visible indexes for other operations
        setVisibleIndexes(newVisibleIndexes);

        // Update pause state with our modifications
        setVideoPaused(newPausedState);
      }
    },
    [currentIndex, visibleIndexes, videoPaused]
  );

  // Memoize campaign item rendering for performance
  const renderCampaignItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      // Calculate task metrics
      const totalTasks = item.tasks
        ? typeof item.tasks === 'object'
          ? Object.keys(item.tasks).length
          : Array.isArray(item.tasks)
            ? item.tasks.length
            : 0
        : 0;
      const progress = getCompletionCount(index);
      const isCompleted = progress === totalTasks && totalTasks > 0;

      // Get number of likers - handle nested arrays and normalize format
      let likersCount = 0;
      if (item.likers) {
        // Handle nested arrays in likers
        const likersArray = Array.isArray(item.likers)
          ? Array.isArray(item.likers[0])
            ? item.likers.flat() // Handle nested array
            : item.likers // Already flat array
          : [];

        // Count unique users by normalizing the format
        const uniqueLikers = new Set();
        likersArray.forEach((liker: any) => {
          if (!liker) return;
          // Remove quotes if present
          const cleanLiker =
            typeof liker === 'string'
              ? liker.replace(/^"(.*)"$/, '$1').replace(/\\/g, '')
              : String(liker);
          uniqueLikers.add(cleanLiker);
        });
        likersCount = uniqueLikers.size;
      }

      // Check if this specific campaign is liked by the user
      const isLikedByCurrent = item.id ? likedCampaigns[item.id] || false : false;

      // Video should be paused when not in view
      const isPaused = videoPaused[index] !== false;

      return (
        <CampaignItem
          item={item}
          index={index}
          currentIndex={currentIndex}
          isLastItem={index === campaigns.length - 1}
          videoRefs={videoRefs}
          videoPaused={isPaused}
          expandedDescription={expandedDescription && currentIndex === index}
          isLiked={isLikedByCurrent}
          likeCount={likersCount}
          followState={followState}
          hasJoined={hasJoined}
          progress={progress}
          totalTasks={totalTasks}
          isCompleted={isCompleted}
          onToggleVideo={toggleVideoPlayback}
          onToggleDescription={() => setExpandedDescription(!expandedDescription)}
          onDetailsPress={toggleDetailsPanel}
          onTrophyPress={handleTrophyPress}
          onLikePress={handleLikePress}
          onFollowPress={handleFollowPress}
          onWebsitePress={() => openInAppBrowser(item.cta?.url)}
        />
      );
    },
    [
      currentIndex,
      expandedDescription,
      followState,
      hasJoined,
      likedCampaigns,
      videoPaused,
      getCompletionCount,
      handleLikePress,
      handleFollowPress,
      handleTrophyPress,
      toggleDetailsPanel,
      toggleVideoPlayback,
      openInAppBrowser,
      campaigns,
    ]
  );

  // Key extractor optimization
  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* Main campaign feed */}
      <View style={styles.container}>
        {isLoading && !refreshing && campaigns.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#B71C1C" />
            <Text style={styles.loadingText}>Loading campaigns...</Text>
          </View>
        ) : campaigns.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No campaigns available</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={campaigns}
            renderItem={renderCampaignItem}
            keyExtractor={keyExtractor}
            pagingEnabled={true}
            snapToInterval={height}
            snapToAlignment={'start'}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={VIEWABILITY_CONFIG}
            disableIntervalMomentum={true}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.y / height);
              if (newIndex !== currentIndex && mountedRef.current) {
                setCurrentIndex(newIndex);
              }
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#ffffff"
                colors={['#B71C1C']}
                progressBackgroundColor="#000000"
                title="Pull to refresh"
                titleColor="#ffffff"
              />
            }
            initialNumToRender={2}
            maxToRenderPerBatch={3}
            windowSize={5}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            removeClippedSubviews={true} // Improve memory usage
          />
        )}

        {/* Show loading indicator while refreshing */}
        {refreshing && (
          <View style={styles.refreshingIndicator}>
            <ActivityIndicator color="#B71C1C" />
          </View>
        )}
      </View>

      {/* Tasks Modal */}
      <TasksModal
        visible={taskPanelVisible}
        campaign={campaigns[currentIndex]}
        animation={slideAnimation}
        onClose={toggleTaskPanel}
        onTaskAction={handleTaskAction}
        currentIndex={currentIndex}
        userProgress={userProgress}
      />

      {/* Campaign Details Modal */}
      <CampaignDetailsModal
        visible={detailsPanelVisible}
        campaign={campaigns[currentIndex]}
        animation={detailsAnimation}
        hasJoined={hasJoined[currentIndex] || false}
        currentIndex={currentIndex}
        onClose={toggleDetailsPanel}
        onJoin={handleJoinCampaign}
      />

      {/* In-App Browser */}
      <InAppBrowser
        url={browserUrl}
        visible={browserVisible}
        onClose={() => setBrowserVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  refreshingIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default Home;
