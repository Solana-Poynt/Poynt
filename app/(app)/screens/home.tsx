import { router, Stack } from 'expo-router';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Text,
  Dimensions,
  AppState,
  RefreshControl,
  ViewToken,
  Linking,
} from 'react-native';
import { usePathname } from 'expo-router';
import {
  getDataFromAsyncStorage,
  getJSONFromAsyncStorage,
  saveJSONToAsyncStorage,
} from '~/utils/localStorage';
import CampaignItem from '~/components/campaigns/CampaignItem';
import TasksModal from '~/components/campaigns/TasksModal';
import CampaignDetailsModal from '~/components/campaigns/CampaignDetailsModal';
import InAppBrowser from '~/components/campaigns/InAppBrowser';
import { useSelector, useDispatch } from 'react-redux';
import { useCampaignActions, useCampaignInteractions } from '~/hooks/useCampaignActions';
import {
  selectAllCampaigns,
  selectIsLoading,
  setActiveCampaign,
} from '~/store/slices/isCampaignSlice';
import { selectIsConnected } from '~/store/slices/isNetworkSlice';
import { AppDispatch } from '~/store/store';
import { Campaign, useViewCampaignMutation, useAddEngagementMutation } from '~/store/api/api';
import Notification from '~/components/Notification';
import { AppStateStatus } from 'react-native';

const { height } = Dimensions.get('window');
const USER_TASK_PROGRESS_KEY = 'userTaskProgress';
const SCROLL_POSITION_KEY = 'campaignScrollPosition';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 50,
  waitForInteraction: false,
};

const PRELOAD_BEFORE = 1;
const PRELOAD_AFTER = 3;

interface NotificationState {
  show: boolean;
  message: string;
  status: 'success' | 'error' | '';
}
interface VideoRefState {
  [key: number]: {
    ref: any;
    isReady: boolean;
  };
}
interface UserProgress {
  [campaignId: string]: {
    completedTasks: number[];
    attemptedTasks: number[];
    proofUrls: Record<number, string>;
  };
}

const useIsMounted = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
};

const VideoController = React.memo(
  ({
    index,
    isVisible,
    isPreloading,
    videoRef,
    campaignId,
    isReady,
  }: {
    index: number;
    isVisible: boolean;
    isPreloading: boolean;
    videoRef: any;
    campaignId: string;
    isReady: boolean;
  }) => {
    const appState = useRef(AppState.currentState);
    const componentMountedRef = useRef(true);
    const isInitializedRef = useRef(false);

    // Initialization status
    useEffect(() => {
      componentMountedRef.current = true;

      // Add a small delay before trying to control video
      if (!isInitializedRef.current && videoRef && isReady) {
        isInitializedRef.current = true;
      }

      return () => {
        componentMountedRef.current = false;
      };
    }, [videoRef, isReady]);

    // Video control effect
    useEffect(() => {
     
      if (!videoRef || !isReady || !componentMountedRef.current) return;

      const isValidVideoRef =
        videoRef &&
        typeof videoRef === 'object' &&
        typeof videoRef.resume === 'function' &&
        typeof videoRef.pause === 'function';

      if (!isValidVideoRef) return;

      // Use a controller function that we can call with delay
      const controller = () => {
        try {
          if (isVisible && appState.current === 'active') {
            videoRef.resume?.();
          } else {
            videoRef.pause?.();
            if (!isPreloading && videoRef.seek) {
              videoRef.seek(0);
            }
          }
        } catch (error) {
          console.log('Video control error:', error);
        }
      };

      // Add a delay before attempting to control video
      // This gives the video component time to fully mount
      const timer = setTimeout(controller, 30);

      return () => {
        clearTimeout(timer);
        // Make sure to pause video when effect is cleaned up
        if (isValidVideoRef && componentMountedRef.current) {
          try {
            videoRef.pause?.();
          } catch (error) {
            // Silent error
          }
        }
      };
    }, [isVisible, isPreloading, videoRef, campaignId, isReady]);

    // App state management effect
    useEffect(() => {
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        appState.current = nextAppState;

        // Don't try to control video if not mounted or ready
        if (!videoRef || !isReady) return;

        if (nextAppState !== 'active') {
          try {
            videoRef.pause?.();
          } catch (error) {
            // Silent error
          }
        } else if (nextAppState === 'active' && isVisible) {
          try {
            videoRef.resume?.();
          } catch (error) {
            // Silent error
          }
        }
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription.remove();
    }, [isVisible, videoRef, isReady]);

    return null;
  }
);

const CampaignItemWrapper = React.memo(
  ({
    item,
    index,
    visibleIndexes,
    preloadIndexes,
    campaignsLength,
    videoRefs,
    expandedDescription,
    progress,
    totalTasks,
    isCompleted,
    setExpandedDescription,
    openModal,
    openInAppBrowser,
    isConnected,
    userId,
    currentCampaignId,
    setCurrentCampaign,
    registerVideoRef,
    markVideoReady,
  }: {
    item: Campaign;
    index: number;
    visibleIndexes: number[];
    preloadIndexes: number[];
    campaignsLength: number;
    videoRefs: React.MutableRefObject<VideoRefState>;
    expandedDescription: boolean;
    progress: number;
    totalTasks: number;
    isCompleted: boolean;
    setExpandedDescription: () => void;
    openModal: (modalType: 'details' | 'tasks', campaignId: string) => void;
    openInAppBrowser: (url: string) => void;
    isConnected: boolean;
    userId: string | null;
    currentCampaignId: string | null;
    setCurrentCampaign: (id: string) => void;
    registerVideoRef: (index: number, ref: any) => void;
    markVideoReady: (index: number) => void;
  }) => {
    const pathname = usePathname();
    const isHomeScreen = pathname === '/screens/home';
    const isItemVisible = isHomeScreen && visibleIndexes.includes(index);
    const isPreloading = isHomeScreen && preloadIndexes.includes(index);
    const isNext = index === visibleIndexes[0] + 1;

    const {
      campaign,
      isLiked,
      isParticipated,
      isPendingLike,
      isPendingParticipation,
      likeCount,
      hasStalePendingActions,
      resetPendingState,
    } = useCampaignInteractions(item.id);
    const { toggleLike, toggleJoin } = useCampaignActions();

    const handleLikePress = useCallback(() => {
      if (!userId) return;
      toggleLike(userId, item.id, isLiked);
    }, [userId, item.id, isLiked, toggleLike]);

    const handleJoinPress = useCallback(() => {
      if (!userId) return;
      toggleJoin(userId, item.id, isParticipated);
      openModal(isParticipated ? 'tasks' : 'details', item.id);
    }, [userId, item.id, isParticipated, toggleJoin, openModal]);

    const handleWebsitePress = useCallback(() => {
      if (item?.cta?.url) {
        openInAppBrowser(item.cta.url);
      }
    }, [item?.cta?.url, openInAppBrowser]);

    useEffect(() => {
      if (hasStalePendingActions) {
        resetPendingState();
      }
    }, [hasStalePendingActions, resetPendingState]);

    const isMountedRef = useIsMounted();

    useEffect(() => {
      if (isItemVisible && item.id !== currentCampaignId && isMountedRef.current) {
        setCurrentCampaign(item.id);
      }
    }, [isItemVisible, item.id, currentCampaignId, setCurrentCampaign]);

    const displayItem = campaign || item;
    const actualLikeCount = likeCount || displayItem.likersCount || 0;

    return (
      <View style={{ height }}>
        <CampaignItem
          item={displayItem}
          index={index}
          currentIndex={visibleIndexes[0] ?? 0}
          isLastItem={index === campaignsLength - 1}
          videoRefs={videoRefs}
          videoPaused={!isItemVisible}
          expandedDescription={expandedDescription}
          isLiked={isLiked}
          likeCount={actualLikeCount}
          hasJoined={isParticipated}
          isPendingLike={isPendingLike}
          isPendingJoin={isPendingParticipation}
          progress={progress}
          totalTasks={totalTasks}
          isCompleted={isCompleted}
          onToggleVideo={() => {}}
          onToggleDescription={setExpandedDescription}
          toggleDetailsPanel={() => openModal('details', item.id)}
          onTrophyPress={handleJoinPress}
          onWebsitePress={handleWebsitePress}
          onLikePress={handleLikePress}
          isOffline={!isConnected}
          userId={userId}
          isVisible={isItemVisible}
          isNext={isNext}
          isPreloading={isPreloading}
          registerVideoRef={(ref) => registerVideoRef(index, ref)}
          markVideoReady={() => markVideoReady(index)}
        />
        {videoRefs.current[index] && (
          <VideoController
            key={`video-controller-${item.id}-${index}`}
            index={index}
            isVisible={isItemVisible}
            isPreloading={isPreloading}
            videoRef={videoRefs.current[index]?.ref}
            campaignId={item.id}
            isReady={videoRefs.current[index]?.isReady || false}
          />
        )}
      </View>
    );
  },
  // Optimized memo comparison for better performance
  (prevProps, nextProps) => {
    // Most important optimizations first
    if (prevProps.index !== nextProps.index) return false;
    if (prevProps.item.id !== nextProps.item.id) return false;

    // Check visibility changes which affect rendering
    const prevIsVisible = prevProps.visibleIndexes.includes(prevProps.index);
    const nextIsVisible = nextProps.visibleIndexes.includes(nextProps.index);
    if (prevIsVisible !== nextIsVisible) return false;

    // Check preloading changes
    const prevIsPreloading = prevProps.preloadIndexes.includes(prevProps.index);
    const nextIsPreloading = nextProps.preloadIndexes.includes(nextProps.index);
    if (prevIsPreloading !== nextIsPreloading) return false;

    // Other important props that affect rendering
    if (prevProps.expandedDescription !== nextProps.expandedDescription) return false;
    if (prevProps.progress !== nextProps.progress) return false;
    if (prevProps.isCompleted !== nextProps.isCompleted) return false;
    if (prevProps.isConnected !== nextProps.isConnected) return false;

    // Less important props for memoization
    if (prevProps.currentCampaignId !== nextProps.currentCampaignId) return false;

    // These array comparisons are expensive, so do them last
    // and only if everything else has passed
    const visibleIndexesChanged =
      JSON.stringify(prevProps.visibleIndexes) !== JSON.stringify(nextProps.visibleIndexes);
    if (visibleIndexesChanged) return false;

    return true;
  }
);

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const campaigns = useSelector(selectAllCampaigns);
  const isLoading = useSelector(selectIsLoading);
  const isConnected = useSelector(selectIsConnected);
  const { getCampaigns, setCurrentCampaign } = useCampaignActions();
  const [viewCampaign] = useViewCampaignMutation();
  const [AddEngagement] = useAddEngagementMutation();

  const [visibleIndexes, setVisibleIndexes] = useState<number[]>([0]);
  const [preloadIndexes, setPreloadIndexes] = useState<number[]>([1, 2]); 
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    type: 'none' | 'details' | 'tasks';
    campaignId: string | null;
  }>({ type: 'none', campaignId: null });
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasTwitterConnected, setHasTwitterConnected] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: '',
    status: '',
  });
  // Track whether initial data loading is complete
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState<boolean>(false);

  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [browserVisible, setBrowserVisible] = useState<boolean>(false);
  const [browserUrl, setBrowserUrl] = useState<string>('');

  const viewedCampaigns = useRef<Set<string>>(new Set());
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialScrollIndex = useRef<number | null>(null);
  const hasRestoredScroll = useRef<boolean>(false);
  const videoRefs = useRef<VideoRefState>({});
  const isMountedRef = useIsMounted();
  const flatListRef = useRef<FlatList>(null);
  const appStateRef = useRef<string>(AppState.currentState);
  const isRestoringFromBackground = useRef<boolean>(false);
  const lastVisibleIndexRef = useRef<number>(0);
  const scrollPositionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const didInitialRender = useRef<boolean>(false);

  const registerVideoRef = useCallback((index: number, ref: any) => {
    if (ref) {
      videoRefs.current[index] = {
        ref,
        isReady: false,
      };
    }
  }, []);

  const markVideoReady = useCallback((index: number) => {
    if (videoRefs.current[index]) {
      videoRefs.current[index].isReady = true;
    }
  }, []);

  // Add to Home component
  useEffect(() => {
    // Periodically clean up resources for far-away videos
    const cleanupInterval = setInterval(() => {
      if (campaigns.length === 0 || !isMountedRef.current) return;

      // Get the current visible index
      const visibleIndex = visibleIndexes[0] || 0;

      // Clean up videos that are far from current view
      Object.keys(videoRefs.current).forEach((indexKey) => {
        const index = parseInt(indexKey, 10);
        // If video is far from current view (more than 5 items away)
        if (Math.abs(index - visibleIndex) > 5) {
          // Reset video to free up resources
          try {
            const videoRef = videoRefs.current[index]?.ref;
            if (videoRef && videoRef.pause) {
              videoRef.pause();
              if (videoRef.seek) videoRef.seek(0);
            }
          } catch (error) {
            // Silent error
          }
        }
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(cleanupInterval);
  }, [campaigns.length, visibleIndexes]);

  // Improved scroll position loading with immediate state update
  const loadScrollPosition = useCallback(async () => {
    try {
      console.log('Loading scroll position...');
      const savedPositionData = await getJSONFromAsyncStorage(SCROLL_POSITION_KEY);
      if (
        savedPositionData &&
        typeof savedPositionData.index === 'number' &&
        !hasRestoredScroll.current
      ) {
        const validIndex = savedPositionData.index;
        console.log('Restoring to index:', validIndex);
        initialScrollIndex.current = validIndex;
        return validIndex;
      }
      console.log('No saved scroll position found');
      return null;
    } catch (error) {
      console.log('Error loading scroll position:', error);
      return null;
    }
  }, []);

  const saveScrollPosition = useCallback(async (index: number) => {
    if (!isMountedRef.current) return;

    // Clear any pending save operation
    if (scrollPositionChangeTimeoutRef.current) {
      clearTimeout(scrollPositionChangeTimeoutRef.current);
    }

    // Debounce the save operation to avoid excessive storage writes
    scrollPositionChangeTimeoutRef.current = setTimeout(async () => {
      try {
        const positionData = { index, timestamp: Date.now() };
        await saveJSONToAsyncStorage(SCROLL_POSITION_KEY, positionData);
        console.log('Successfully saved scroll position at index:', index);
      } catch (error) {
        console.log('Error saving scroll position:', error);
      }
    }, 300);
  }, []);

  const loadUserProgress = useCallback(async () => {
    if (!isMountedRef.current) return null;
    try {
      const savedProgress = await getJSONFromAsyncStorage(USER_TASK_PROGRESS_KEY);
      if (savedProgress) {
        const updatedProgress: UserProgress = {};
        Object.keys(savedProgress).forEach((campaignId) => {
          updatedProgress[campaignId] = {
            completedTasks: savedProgress[campaignId]?.completedTasks || [],
            attemptedTasks: savedProgress[campaignId]?.attemptedTasks || [],
            proofUrls: savedProgress[campaignId]?.proofUrls || {},
          };
        });
        setUserProgress(updatedProgress);
        return updatedProgress;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  const checkTwitterConnection = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const xAccount = await getDataFromAsyncStorage('x_account');
      setHasTwitterConnected(!!xAccount);
    } catch (error) {
      setHasTwitterConnected(false);
    }
  }, []);

  // Update the initial data loading effect
  useEffect(() => {
    const initializeUserData = async () => {
      try {
        console.log('Starting data initialization...');
        const id = await getDataFromAsyncStorage('id');
        if (isMountedRef.current && id) {
          // FIX: Changed from !isMountedRef.current to isMountedRef.current
          setUserId(id);

          // Load other data first
          await Promise.all([loadUserProgress(), checkTwitterConnection()]);

          // Only then attempt to restore scroll position
          const scrollIndex = await loadScrollPosition();
          if (scrollIndex !== null && isMountedRef.current) {
            // Only restore position if it's not the first item
            // This prevents rearrangement when just showing the first item
            if (scrollIndex > 0) {
              initialScrollIndex.current = scrollIndex;
              console.log('Initial scroll index set to:', scrollIndex);
            } else {
              // Don't try to restore if it's the first item
              initialScrollIndex.current = 0;
              hasRestoredScroll.current = true; // Mark as done
            }
          }
        }

        // Mark initial data as loaded
        setIsInitialDataLoaded(true);
      } catch (error) {
        console.log('Error in initialization:', error);
        setIsInitialDataLoaded(true);
      }
    };

    initializeUserData();
    getCampaigns(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [getCampaigns, loadScrollPosition, loadUserProgress, checkTwitterConnection]);

  // Calculate preload indexes based on visible indexes
  const updatePreloadIndexes = useCallback(
    (visibleIndex: number) => {
      if (!isMountedRef.current || campaigns.length === 0) return;

      const newPreloadIndexes: number[] = [];

      // Add items before visible index for preloading (limited by array bounds)
      for (let i = 1; i <= PRELOAD_BEFORE; i++) {
        const preloadIndex = visibleIndex - i;
        if (preloadIndex >= 0) {
          newPreloadIndexes.push(preloadIndex);
        }
      }

      // Add items after visible index for preloading (limited by array bounds)
      for (let i = 1; i <= PRELOAD_AFTER; i++) {
        const preloadIndex = visibleIndex + i;
        if (preloadIndex < campaigns.length) {
          newPreloadIndexes.push(preloadIndex);
        }
      }

      setPreloadIndexes(newPreloadIndexes);
    },
    [campaigns.length]
  );

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (!isMountedRef.current) return;

      const isGoingToBackground =
        appStateRef.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive');

      const isComingToForeground =
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        nextAppState === 'active';

      if (isGoingToBackground && visibleIndexes.length > 0) {
        saveScrollPosition(visibleIndexes[0]);
        if (viewTimerRef.current) {
          clearTimeout(viewTimerRef.current);
          viewTimerRef.current = null;
        }
      }

      if (isComingToForeground) {
        isRestoringFromBackground.current = true;
        loadUserProgress();
        checkTwitterConnection();

        // Add a small delay before trying to restore scroll position
        setTimeout(() => {
          if (visibleIndexes.length > 0 && flatListRef.current && campaigns.length > 0) {
            const validIndex = Math.min(visibleIndexes[0], campaigns.length - 1);
            flatListRef.current.scrollToIndex({
              index: validIndex,
              animated: false,
              viewOffset: 0, // Ensure it's centered correctly
              viewPosition: 0,
            });
          }
        }, 300);
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [
    visibleIndexes,
    saveScrollPosition,
    loadUserProgress,
    checkTwitterConnection,
    campaigns.length,
  ]);

  // Update current campaign on visibility change
  useEffect(() => {
    if (campaigns.length > 0 && visibleIndexes.length > 0) {
      const visibleIndex = visibleIndexes[0];
      if (visibleIndex !== undefined && campaigns[visibleIndex]) {
        const campaign = campaigns[visibleIndex];
        setCurrentCampaignId(campaign.id);
        dispatch(setActiveCampaign(campaign));

        // Only save position if it actually changed
        if (lastVisibleIndexRef.current !== visibleIndex) {
          saveScrollPosition(visibleIndex);
          lastVisibleIndexRef.current = visibleIndex;

          // Update preload indexes when visible index changes
          updatePreloadIndexes(visibleIndex);
        }

        isRestoringFromBackground.current = false;
      }
    }
  }, [visibleIndexes, campaigns, dispatch, saveScrollPosition, updatePreloadIndexes]);

  // Dedicated effect for initial scroll restoration to ensure it happens
  // after the FlatList has fully rendered
  useEffect(() => {
    // Only proceed if we have campaigns, haven't restored scroll yet, and initial data is loaded
    if (
      campaigns.length > 0 &&
      initialScrollIndex.current !== null &&
      !hasRestoredScroll.current &&
      isInitialDataLoaded &&
      flatListRef.current &&
      !didInitialRender.current
    ) {
      const validIndex = Math.min(initialScrollIndex.current, campaigns.length - 1);

      if (validIndex >= 0) {
        console.log('Attempting to restore scroll to index:', validIndex);
        didInitialRender.current = true;

        // Use a longer timeout to ensure the FlatList is fully rendered
        setTimeout(() => {
          if (!flatListRef.current || !isMountedRef.current) {
            console.log('FlatList ref no longer valid');
            return;
          }

          try {
            console.log('Scrolling to index:', validIndex);
            flatListRef.current.scrollToIndex({
              index: validIndex,
              animated: false,
              viewPosition: 0,
            });

            setVisibleIndexes([validIndex]);
            updatePreloadIndexes(validIndex);
            hasRestoredScroll.current = true;
            console.log('Scroll position restored successfully');
          } catch (error) {
            console.log('Error restoring scroll position:', error);

            // Fallback: try scrolling to offset
            try {
              const offset = validIndex * height;
              flatListRef.current.scrollToOffset({
                offset,
                animated: false,
              });
              console.log('Used offset fallback:', offset);

              // Then try again with index after a short delay
              setTimeout(() => {
                if (flatListRef.current && isMountedRef.current) {
                  flatListRef.current.scrollToIndex({
                    index: validIndex,
                    animated: false,
                    viewPosition: 0,
                  });
                  setVisibleIndexes([validIndex]);
                  updatePreloadIndexes(validIndex);
                  hasRestoredScroll.current = true;
                }
              }, 100);
            } catch (secondError) {
              console.log('Fallback also failed:', secondError);
            }
          }
        }, 500); // Increased delay for more reliable restoration
      }
    }
  }, [campaigns.length, isInitialDataLoaded, updatePreloadIndexes]);

  // Reset expanded description when changing items
  useEffect(() => {
    if (isMountedRef.current && visibleIndexes.length > 0) {
      setExpandedDescriptionId(null);
    }
  }, [visibleIndexes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
      if (scrollPositionChangeTimeoutRef.current) {
        clearTimeout(scrollPositionChangeTimeoutRef.current);
      }
      isMountedRef.current = false;
    };
  }, []);

  const openModal = useCallback(
    async (modalType: 'details' | 'tasks', campaignId: string) => {
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!campaign) return;

      setCurrentCampaign(campaignId);
      setModalState({ type: modalType, campaignId });
    },
    [campaigns, setCurrentCampaign]
  );

  const closeModal = useCallback(() => {
    setModalState({ type: 'none', campaignId: null });
  }, []);

  // Twitter deeplinking support
  const openInAppBrowser = useCallback((url: string) => {
    if (!url) return;

    // Check if it's a Twitter/X URL
    if (url.includes('twitter.com') || url.includes('x.com')) {
      let twitterDeeplink = '';

      try {
        // Parse the URL to extract relevant information
        if (url.includes('/status/')) {
          // It's a tweet
          const tweetId = url.split('/status/')[1].split(/[?#]/)[0];
          twitterDeeplink = `twitter://status?id=${tweetId}`;
        } else if (url.includes('/hashtag/')) {
          // It's a hashtag
          const hashtag = url.split('/hashtag/')[1].split(/[?#]/)[0];
          twitterDeeplink = `twitter://search?query=%23${hashtag}`;
        } else {
          // It's likely a profile
          const pathParts = url.split('.com/')[1]?.split('/')[0];
          if (pathParts) {
            twitterDeeplink = `twitter://user?screen_name=${pathParts}`;
          }
        }

        if (twitterDeeplink) {
          Linking.canOpenURL(twitterDeeplink)
            .then((supported) => {
              if (supported) {
                Linking.openURL(twitterDeeplink);
              } else {
                // Fall back to in-app browser
                openInBrowser(url);
              }
            })
            .catch(() => {
              // Fall back to in-app browser
              openInBrowser(url);
            });
          return;
        }
      } catch (error) {
        console.log('Error parsing Twitter URL:', error);
      }
    }

    // For non-Twitter URLs or fallback, use in-app browser
    openInBrowser(url);
  }, []);

  // Helper function to open the in-app browser
  const openInBrowser = useCallback((url: string) => {
    setBrowserVisible(false);
    setBrowserUrl('');

    setTimeout(() => {
      setBrowserUrl(url);
      setBrowserVisible(true);
    }, 50);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setVisibleIndexes([]);
      initialScrollIndex.current = null;
      hasRestoredScroll.current = false;
      setCurrentCampaignId(null);
      videoRefs.current = {};

      await getCampaigns(true);

      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
        setTimeout(() => {
          setVisibleIndexes([0]);
          updatePreloadIndexes(0);
        }, 300);
      }

      await Promise.all([checkTwitterConnection(), loadUserProgress()]);
    } catch (error) {
      console.log('Refresh error:', error);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [getCampaigns, checkTwitterConnection, loadUserProgress, updatePreloadIndexes]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!isMountedRef.current || refreshing) return;

      // Filter visible items and get their indices
      const newVisibleIndexes = viewableItems
        .filter((item) => item.isViewable && item.index !== null)
        .map((item) => item.index!)
        .slice(0, 1);

      // Clear any existing view timer when scrolling happens
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }

      // Only proceed if we have a valid visible index that's different from current
      if (newVisibleIndexes.length > 0 && newVisibleIndexes[0] !== visibleIndexes[0]) {
        // Validate the index is within bounds
        if (newVisibleIndexes[0] >= 0 && newVisibleIndexes[0] < campaigns.length) {
          // Immediately update visible indexes to ensure videos stop/start correctly
          setVisibleIndexes(newVisibleIndexes);

          // Reset expanded description when changing items
          setExpandedDescriptionId(null);

          // Track campaign view after a delay (this avoids counting rapid scrolls)
          if (userId && campaigns[newVisibleIndexes[0]]) {
            const campaignId = campaigns[newVisibleIndexes[0]].id;

            viewTimerRef.current = setTimeout(async () => {
              if (!viewedCampaigns.current.has(campaignId) && isMountedRef.current) {
                try {
                  await viewCampaign({ viewerId: userId, campaignId }).unwrap();
                  await AddEngagement({ campaignId }).unwrap();
                  viewedCampaigns.current.add(campaignId);
                } catch (error) {
                  console.log('View tracking error:', error);
                }
              }
            }, 10000); // 10 seconds for view counting
          }
        }
      } else if (newVisibleIndexes.length === 0 && campaigns.length > 0 && !refreshing) {
        // Fallback to first item if nothing is visible
        setVisibleIndexes([0]);
        updatePreloadIndexes(0);
      }
    },
    [userId, campaigns, viewCampaign, visibleIndexes, refreshing, updatePreloadIndexes]
  );

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      console.log('Failed to scroll to index', info);

      // More robust recovery from scroll failures
      if (flatListRef.current) {
        // Try scrolling to an offset instead
        const offset = info.index * height;
        flatListRef.current.scrollToOffset({
          offset,
          animated: false,
        });

        // Then try again with the index after a delay
        setTimeout(() => {
          if (flatListRef.current && isMountedRef.current) {
            // Try with viewPosition centered (0.5) for better reliability
            flatListRef.current.scrollToIndex({
              index: info.index,
              animated: false,
              viewPosition: 0,
            });
            setVisibleIndexes([info.index]);
            updatePreloadIndexes(info.index);
          }
        }, 300); // Increased timeout for better reliability
      }
    },
    [updatePreloadIndexes]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: height,
      offset: height * index,
      index,
    }),
    []
  );

  const getCompletionCount = useCallback(
    (campaignId: string): number => {
      return userProgress[campaignId]?.completedTasks?.length || 0;
    },
    [userProgress]
  );

  const getCampaignByIdLocal = useCallback(
    (campaignId: string | null): Campaign | undefined => {
      if (!campaignId) return undefined;
      return campaigns.find((campaign) => campaign.id === campaignId);
    },
    [campaigns]
  );

  const renderCampaignItem = useCallback(
    ({ item, index }: { item: Campaign; index: number }) => {
      const totalTasks = item.tasks ? Object.keys(item.tasks).length : 0;
      const progress = getCompletionCount(item.id);
      const isCompleted = progress === totalTasks && totalTasks > 0;
      const isDescriptionExpanded = expandedDescriptionId === item.id;

      // Using a constant key pattern instead of creating new function references
      const setDescriptionHandler = () => {
        setExpandedDescriptionId(isDescriptionExpanded ? null : item.id);
      };

      return (
        <CampaignItemWrapper
          key={`campaign-item-${item.id}`}
          item={item}
          index={index}
          visibleIndexes={visibleIndexes}
          preloadIndexes={preloadIndexes}
          campaignsLength={campaigns.length}
          videoRefs={videoRefs}
          expandedDescription={isDescriptionExpanded}
          progress={progress}
          totalTasks={totalTasks}
          isCompleted={isCompleted}
          setExpandedDescription={setDescriptionHandler}
          openModal={openModal}
          openInAppBrowser={openInAppBrowser}
          isConnected={isConnected}
          userId={userId}
          currentCampaignId={currentCampaignId}
          setCurrentCampaign={setCurrentCampaign}
          registerVideoRef={registerVideoRef}
          markVideoReady={markVideoReady}
        />
      );
    },
    [
      visibleIndexes,
      preloadIndexes,
      expandedDescriptionId,
      campaigns.length,
      openModal,
      openInAppBrowser,
      isConnected,
      userId,
      getCompletionCount,
      currentCampaignId,
      setCurrentCampaign,
      registerVideoRef,
      markVideoReady,
    ]
  );

  const keyExtractor = useCallback((item: Campaign) => item.id, []);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor="#ffffff"
        colors={['#B71C1C']}
        progressBackgroundColor="#000000"
        title="Pull to refresh"
        titleColor="#ffffff"
      />
    ),
    [refreshing, onRefresh]
  );

  const currentCampaign = useMemo(
    () => getCampaignByIdLocal(modalState.campaignId),
    [getCampaignByIdLocal, modalState.campaignId]
  );

  // Optimized FlatList configuration with explicit type annotations for accurate TypeScript checking
  const flatListProps = useMemo(
    () => ({
      data: campaigns,
      renderItem: renderCampaignItem,
      keyExtractor: keyExtractor,
      pagingEnabled: true,
      snapToInterval: height,
      snapToAlignment: 'start' as const,
      decelerationRate: 'fast' as const,
      showsVerticalScrollIndicator: false,
      onViewableItemsChanged: handleViewableItemsChanged,
      viewabilityConfig: VIEWABILITY_CONFIG,
      disableIntervalMomentum: true, // Prevent momentum scrolling
      refreshControl: refreshControl,
      initialNumToRender: 2,
      maxToRenderPerBatch: 2,
      windowSize: 3,
      removeClippedSubviews: true,
      maintainVisibleContentPosition: { minIndexForVisible: 0 },
      initialScrollIndex: initialScrollIndex.current !== null ? initialScrollIndex.current : 0,
      onScrollToIndexFailed: handleScrollToIndexFailed,
      getItemLayout: getItemLayout,
      // Improving scrolling performance
      scrollEventThrottle: 16, // 60 FPS target
      // Additional optimizations
      updateCellsBatchingPeriod: 50, // Faster cell updates
      keyboardDismissMode: 'on-drag' as const, // Hide keyboard on scroll
      keyboardShouldPersistTaps: 'handled' as const, // Better keyboard handling
      legacyImplementation: false, // Use modern implementation
    }),
    [
      campaigns,
      renderCampaignItem,
      keyExtractor,
      handleViewableItemsChanged,
      refreshControl,
      initialScrollIndex,
      handleScrollToIndexFailed,
      getItemLayout,
    ]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="black" />
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
            {...flatListProps}
            // Key is added to force recreation of the FlatList when coming back to screen
            key="campaign-feed"
          />
        )}
        {refreshing && (
          <View style={styles.refreshingIndicator}>
            <ActivityIndicator color="#B71C1C" />
          </View>
        )}
      </View>

      {modalState.type === 'tasks' && modalState.campaignId && (
        <TasksModal
          visible={modalState.type === 'tasks'}
          campaign={currentCampaign}
          onClose={closeModal}
          userProgress={userProgress}
          setUserProgress={setUserProgress}
          userId={userId}
          openInAppBrowser={openInAppBrowser}
          xConnected={hasTwitterConnected}
        />
      )}

      {modalState.type === 'details' && modalState.campaignId && (
        <CampaignDetailsModal
          visible={modalState.type === 'details'}
          campaign={currentCampaign}
          onViewTask={() => openModal('tasks', modalState.campaignId!)}
          onClose={closeModal}
        />
      )}

      {notification.show && (
        <Notification
          status={notification.status}
          message={notification.message}
          switchShowOff={() => {
            setNotification({ show: false, message: '', status: '' });
            if (notificationTimeoutRef.current) {
              clearTimeout(notificationTimeoutRef.current);
              notificationTimeoutRef.current = null;
            }
          }}
        />
      )}

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
