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
} from 'react-native';

import { getDataFromAsyncStorage, getJSONFromAsyncStorage } from '~/utils/localStorage';
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
import { Campaign } from '~/store/api/api';
import { debounce } from 'lodash';

const { height } = Dimensions.get('window');
const USER_TASK_PROGRESS_KEY = 'userTaskProgress';

// More lenient viewability config for better performance with poor connectivity
const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 10,
  minimumViewTime: 100,
  waitForInteraction: false,
};

interface UserProgress {
  [campaignId: string]: {
    completedTasks: number[];
  };
}

interface CampaignItemWrapperProps {
  item: Campaign;
  index: number;
  visibleIndexes: number[];
  campaignsLength: number;
  videoRefs: React.MutableRefObject<{ [key: number]: any }>;
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
}

const CampaignItemWrapper: React.FC<CampaignItemWrapperProps> = React.memo(
  ({
    item,
    index,
    visibleIndexes,
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
  }) => {
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

    const { toggleLike, toggleJoin, setCurrentCampaign } = useCampaignActions();

    // Reset stale pending actions if detected
    useEffect(() => {
      if (hasStalePendingActions) {
        resetPendingState();
      }
    }, [hasStalePendingActions, resetPendingState, item.id]);

    const isVisible = visibleIndexes.includes(index);
    const isCurrentCampaign = currentCampaignId === item.id;

    // When this item becomes visible, set it as the active campaign
    useEffect(() => {
      if (isVisible && item.id !== currentCampaignId) {
        setCurrentCampaign(item.id);
      }
    }, [isVisible, item.id, currentCampaignId, setCurrentCampaign]);

    // Log when this item becomes the current campaign
    useEffect(() => {
      if (isCurrentCampaign) {
        console.log('Current Campaign ID:', item.id);
        console.log('Campaign likes:', likeCount);
        console.log('Is liked by user:', isLiked);
      }
    }, [isCurrentCampaign, item.id, likeCount, isLiked]);

    const handleLikePress = useCallback(() => {
      if (!userId) return;
      console.log('IS ABOUT TO TOGGLE LIKE for campaign:', item.id);
      toggleLike(userId, item.id, isLiked);
    }, [userId, item.id, isLiked, toggleLike]);

    const handleJoinPress = useCallback(() => {
      if (!userId) return;
      console.log('IS ABOUT TO TOGGLE JOIN for campaign:', item.id);
      toggleJoin(userId, item.id, isParticipated);
      openModal(isParticipated ? 'tasks' : 'details', item.id);
    }, [userId, item.id, isParticipated, toggleJoin, openModal]);

    const handleWebsitePress = useCallback(() => {
      if (item?.cta?.url) {
        openInAppBrowser(item.cta.url);
      } else {
      }
    }, [item, openInAppBrowser]);

    // Use the campaign from our hook if available (for most up-to-date like count)
    const displayItem = campaign || item;
    const actualLikeCount = likeCount || displayItem.likersCount || 0;

    return (
      <CampaignItem
        item={displayItem}
        index={index}
        currentIndex={visibleIndexes[0] ?? 0}
        isLastItem={index === campaignsLength - 1}
        videoRefs={videoRefs}
        videoPaused={!isVisible}
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
      />
    );
  }
);

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const campaigns = useSelector(selectAllCampaigns);
  const isLoading = useSelector(selectIsLoading);
  const isConnected = useSelector(selectIsConnected);
  const { getCampaigns, setCurrentCampaign } = useCampaignActions();

  // State management
  const [visibleIndexes, setVisibleIndexes] = useState<number[]>([]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    type: 'none' | 'details' | 'tasks';
    campaignId: string | null;
  }>({ type: 'none', campaignId: null });
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<string | null>(null);
  const [appState, setAppState] = useState<string>(AppState.currentState);
  const [browserVisible, setBrowserVisible] = useState<boolean>(false);
  const [browserUrl, setBrowserUrl] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Refs
  const videoRefs = useRef<{ [key: number]: any }>({});
  const mountedRef = useRef<boolean>(true);
  const flatListRef = useRef<FlatList>(null);

  const loadUserProgress = useCallback(async () => {
    try {
      const savedProgress = await getJSONFromAsyncStorage(USER_TASK_PROGRESS_KEY);
      if (savedProgress && mountedRef.current) {
        setUserProgress(savedProgress);
      }
    } catch (error) {
      // Error handled silently
    }
  }, []);

  // User ID effect
  useEffect(() => {
    const getUserId = async () => {
      try {
        const id = await getDataFromAsyncStorage('id');
        if (mountedRef.current && id) {
          setUserId(id);
          loadUserProgress();
        }
      } catch (error) {
        // Error handled silently
      }
    };
    getUserId();
  }, [loadUserProgress]);

  // Initial campaign fetch
  useEffect(() => {
    getCampaigns(false);
    return () => {
      mountedRef.current = false;
    };
  }, [getCampaigns]);

  // App state effect
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: string) => {
      if (!mountedRef.current) return;
      setAppState(nextAppState);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Update currentCampaignId and set active campaign whenever visibleIndexes changes
  useEffect(() => {
    if (visibleIndexes.length > 0 && campaigns.length > 0) {
      const visibleIndex = visibleIndexes[0];
      if (visibleIndex !== undefined && campaigns[visibleIndex]) {
        const campaign = campaigns[visibleIndex];
        setCurrentCampaignId(campaign.id);

        // Set this as the active campaign in Redux
        dispatch(setActiveCampaign(campaign));

        console.log('Current visible campaign:', campaign.id);
      }
    }
  }, [visibleIndexes, campaigns, dispatch]);

  // Focus effect - reset description when index changes
  useEffect(() => {
    if (mountedRef.current && visibleIndexes.length > 0) {
      setExpandedDescriptionId(null);
    }
  }, [visibleIndexes]);

  // Modal handlers
  const openModal = useCallback(
    (modalType: 'details' | 'tasks', campaignId: string) => {
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!campaign) return;

      // Set this as active campaign when opening modal
      setCurrentCampaign(campaignId);

      setModalState({ type: modalType, campaignId });
    },
    [campaigns, setCurrentCampaign]
  );

  const closeModal = useCallback(() => {
    setModalState({ type: 'none', campaignId: null });
  }, []);

  // Browser handlers
  const openInAppBrowser = useCallback((url: string) => {
    if (!url) {
      return;
    }

    // Reset browser state first
    setBrowserVisible(false);
    setBrowserUrl('');

    // Set timeout to ensure state updates before showing
    setTimeout(() => {
      setBrowserUrl(url);
      setBrowserVisible(true);
    }, 50);
  }, []);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getCampaigns(true);
    } catch (error) {
      // Error handled silently
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [getCampaigns]);

  // Viewable items changed handler - optimized for better detection
  const handleViewableItemsChanged = useMemo(
    () =>
      debounce(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (!mountedRef.current) return;

        if (viewableItems.length > 0) {
          const newVisibleIndexes = viewableItems
            .filter((item) => item.isViewable && item.index !== null)
            .map((item) => item.index!)
            .slice(0, 1); // Take only the top visible item

          if (newVisibleIndexes.length > 0) {
            setVisibleIndexes(newVisibleIndexes);
          }
        }
      }, 50),
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      handleViewableItemsChanged.cancel();
    };
  }, [handleViewableItemsChanged]);

  // Helper functions
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

  // Render campaign item
  const renderCampaignItem = useCallback(
    ({ item, index }: { item: Campaign; index: number }) => {
      const totalTasks = item.tasks ? Object.keys(item.tasks).length : 0;
      const progress = getCompletionCount(item.id);
      const isCompleted = progress === totalTasks && totalTasks > 0;
      const isDescriptionExpanded = expandedDescriptionId === item.id;

      return (
        <CampaignItemWrapper
          item={item}
          index={index}
          visibleIndexes={visibleIndexes}
          campaignsLength={campaigns.length}
          videoRefs={videoRefs}
          expandedDescription={isDescriptionExpanded}
          progress={progress}
          totalTasks={totalTasks}
          isCompleted={isCompleted}
          setExpandedDescription={() => {
            setExpandedDescriptionId(isDescriptionExpanded ? null : item.id);
          }}
          openModal={openModal}
          openInAppBrowser={openInAppBrowser}
          isConnected={isConnected}
          userId={userId}
          currentCampaignId={currentCampaignId}
        />
      );
    },
    [
      visibleIndexes,
      expandedDescriptionId,
      campaigns.length,
      openModal,
      openInAppBrowser,
      isConnected,
      userId,
      getCompletionCount,
      currentCampaignId,
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
            data={campaigns}
            renderItem={renderCampaignItem}
            keyExtractor={(item) => item.id}
            pagingEnabled
            snapToInterval={height}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={VIEWABILITY_CONFIG}
            disableIntervalMomentum
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
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            removeClippedSubviews
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
          campaign={getCampaignByIdLocal(modalState.campaignId)}
          onClose={closeModal}
          userProgress={userProgress}
          setUserProgress={setUserProgress}
          userId={userId}
          openInAppBrowser={openInAppBrowser}
        />
      )}
      {modalState.type === 'details' && modalState.campaignId && (
        <CampaignDetailsModal
          visible={modalState.type === 'details'}
          campaign={getCampaignByIdLocal(modalState.campaignId)}
          onViewTask={() => openModal('tasks', modalState.campaignId!)}
          onClose={closeModal}
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
  debugInfo: {
    position: 'absolute',
    top: 40,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
  },
});

export default Home;
