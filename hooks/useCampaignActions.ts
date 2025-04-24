import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '~/store/store';
import {
  likeCampaignOptimistic,
  unlikeCampaignOptimistic,
  participateCampaignOptimistic,
  unparticipateCampaignOptimistic,
  fetchCampaigns,
  fetchCampaignById,
  setActiveCampaign,
  selectAllCampaigns,
  selectActiveCampaign,
  selectUserInteraction,
  selectIsLoading,
  selectHasPendingActions,
  selectHasStalePendingActions,
  resetPendingStateForCampaign,
  selectCampaignById,
} from '~/store/slices/isCampaignSlice';
import {
  queueApiRequest,
  processQueue,
  selectPendingRequestsForCampaign,
} from '~/store/slices/isApiQueueSlice';
import { selectIsConnected } from '~/store/slices/isNetworkSlice';
import { useCallback, useMemo, useEffect, useRef } from 'react';

export const useCampaignActions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isConnected = useSelector(selectIsConnected);
  const campaigns = useSelector(selectAllCampaigns);
  const isLoading = useSelector(selectIsLoading);
  const activeCampaign = useSelector(selectActiveCampaign);
  const lastFetched = useSelector((state: RootState) => state.campaigns.lastFetched);
  const stateRef = useRef<RootState>();

  // Get current state for access after actions
  useEffect(() => {
    stateRef.current = dispatch((_, getState) => getState()) as unknown as RootState;
  }, [dispatch]);

  const getCampaigns = useCallback(
    (forceRefresh = false) => {
      if (
        !forceRefresh &&
        campaigns.length > 0 &&
        lastFetched &&
        Date.now() - lastFetched < 5 * 60 * 1000
      ) {
        return Promise.resolve(campaigns);
      }

      if (isConnected) {
        return dispatch(fetchCampaigns()).unwrap();
      }

      return Promise.resolve(campaigns);
    },
    [dispatch, campaigns, lastFetched, isConnected]
  );

  const getCampaignById = useCallback(
    (campaignId: string, forceRefresh = false) => {
      if (
        !forceRefresh &&
        activeCampaign &&
        activeCampaign.id === campaignId &&
        lastFetched &&
        Date.now() - lastFetched < 5 * 60 * 1000
      ) {
        return Promise.resolve(activeCampaign);
      }

      const cachedCampaign = campaigns.find((campaign) => campaign.id === campaignId);
      if (!isConnected && cachedCampaign) {
        // Set as active campaign even in offline mode
        dispatch(setActiveCampaign(cachedCampaign));
        return Promise.resolve(cachedCampaign);
      }

      if (isConnected) {
        return dispatch(fetchCampaignById(campaignId)).unwrap();
      }

      return Promise.resolve(cachedCampaign || null);
    },
    [dispatch, campaigns, lastFetched, isConnected, activeCampaign]
  );

  const setCurrentCampaign = useCallback(
    (campaignId: string) => {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        dispatch(setActiveCampaign(campaign));
      }
    },
    [campaigns, dispatch]
  );

  const toggleLike = useCallback(
    (userId: string, campaignId: string, isCurrentlyLiked: boolean) => {
      // Check for pending actions using the actual state
      const state = stateRef.current as RootState;
      const hasPendingActions = state ? selectHasPendingActions(state, campaignId) : false;

      if (hasPendingActions) {
        console.log('Skipping toggle like due to pending actions');
        return;
      }

      console.log('Starting toggle like for campaign:', campaignId);

      // Ensure this campaign is set as active
      setCurrentCampaign(campaignId);

      // Optimistic update
      if (isCurrentlyLiked) {
        dispatch(unlikeCampaignOptimistic({ campaignId, likersId: userId }));
      } else {
        dispatch(likeCampaignOptimistic({ campaignId, likersId: userId }));
      }

      // Queue the API request
      dispatch(
        queueApiRequest({
          type: isCurrentlyLiked ? 'campaign/unlike' : 'campaign/like',
          endpoint: `campaign/like/${userId}/${campaignId}`,
          method: 'PATCH',
          data: null,
          metadata: {
            campaignId,
            userId,
            timestamp: Date.now(),
          },
        })
      );

      // Process the queue immediately after queuing
      if (isConnected) {
        dispatch(processQueue());
      }

      // Log updated state information for debugging
      setTimeout(() => {
        const updatedState = dispatch((_, getState) => getState()) as unknown as RootState;
        const updatedCampaign = selectCampaignById(updatedState, campaignId);
        const updatedInteraction = selectUserInteraction(updatedState, campaignId);
        console.log('Updated campaign:', updatedCampaign);
        console.log('Updated interaction:', updatedInteraction);
      }, 0);
    },
    [dispatch, isConnected, setCurrentCampaign]
  );

  const toggleJoin = useCallback(
    (userId: string, campaignId: string, isCurrentlyJoined: boolean) => {
      // Check for pending actions using the actual state
      const state = stateRef.current as RootState;
      const hasPendingActions = state ? selectHasPendingActions(state, campaignId) : false;

      if (hasPendingActions) {
        console.log('Skipping toggle join due to pending actions');
        return;
      }

      console.log('Starting toggle join for campaign:', campaignId);

      // Ensure this campaign is set as active
      setCurrentCampaign(campaignId);

      // Optimistic update
      if (isCurrentlyJoined) {
        dispatch(unparticipateCampaignOptimistic({ campaignId, userId }));
      } else {
        dispatch(participateCampaignOptimistic({ campaignId, userId }));
      }

      // Queue the API request
      dispatch(
        queueApiRequest({
          type: isCurrentlyJoined ? 'campaign/unparticipate' : 'campaign/participate',
          endpoint: `campaign/join/${userId}/${campaignId}`,
          method: 'PATCH',
          data: null,
          metadata: {
            campaignId,
            userId,
            timestamp: Date.now(),
          },
        })
      );

      // Process the queue immediately after queuing
      if (isConnected) {
        dispatch(processQueue());
      }

      // Log updated state information for debugging
      setTimeout(() => {
        const updatedState = dispatch((_, getState) => getState()) as unknown as RootState;
        const updatedCampaign = selectCampaignById(updatedState, campaignId);
        const updatedInteraction = selectUserInteraction(updatedState, campaignId);
        console.log('Updated campaign:', updatedCampaign);
        console.log('Updated interaction:', updatedInteraction);
      }, 0);
    },
    [dispatch, isConnected, setCurrentCampaign]
  );

  return useMemo(
    () => ({
      getCampaigns,
      getCampaignById,
      setCurrentCampaign,
      isLoadingCampaigns: isLoading,
      toggleLike,
      toggleJoin,
      isConnected,
    }),
    [getCampaigns, getCampaignById, setCurrentCampaign, isLoading, toggleLike, toggleJoin, isConnected]
  );
};

export const useCampaignInteractions = (campaignId: string) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get direct access to the campaign data
  const campaign = useSelector((state: RootState) => 
    selectCampaignById(state, campaignId)
  );
  
  const userInteraction = useSelector((state: RootState) =>
    selectUserInteraction(state, campaignId)
  );

  const hasStalePendingActions = useSelector((state: RootState) =>
    selectHasStalePendingActions(state, campaignId)
  );

  const pendingRequests = useSelector((state: RootState) =>
    selectPendingRequestsForCampaign(state, campaignId)
  );

  // Reset stale pending actions if detected
  useEffect(() => {
    if (hasStalePendingActions) {
      dispatch(resetPendingStateForCampaign(campaignId));
    }
  }, [hasStalePendingActions, campaignId, dispatch]);

  return {
    campaign, // Return the campaign data for direct access
    isLiked: userInteraction.liked,
    isParticipated: userInteraction.participated,
    isPendingLike: userInteraction.pendingLike,
    isPendingParticipation: userInteraction.pendingParticipation,
    likeCount: campaign?.likersCount || 0, // Direct access to like count
    participantCount: campaign?.participantsCount || 0,
    hasPendingActions: userInteraction.pendingLike || userInteraction.pendingParticipation,
    hasStalePendingActions,
    pendingRequestsCount: pendingRequests.length,
    resetPendingState: () => dispatch(resetPendingStateForCampaign(campaignId)),
  };
};