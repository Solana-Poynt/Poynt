import { createSlice, createAsyncThunk, PayloadAction, createAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { Campaign } from '../api/api';
import { RootState } from '../store';
import { baseAdURL } from '~/utils/config/baseUrl';
import { getDataFromAsyncStorage } from '../../utils/localStorage';

// Define action to set active campaign
export const setActiveCampaign = createAction<Campaign>('campaigns/setActiveCampaign');

interface Payloadz {
  campaignId: string;
  likersId: string;
}

interface JoinPayload {
  campaignId: string;
  userId: string;
}

interface UserInteraction {
  liked: boolean;
  pendingLike: boolean;
  participated: boolean;
  pendingParticipation: boolean;
  // Store previous state for better rollbacks
  previousState?: {
    liked: boolean;
    participated: boolean;
    timestamp: number;
  };
}

interface CampaignState {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  userInteractions: {
    [campaignId: string]: UserInteraction;
  };
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: CampaignState = {
  campaigns: [],
  activeCampaign: null,
  userInteractions: {},
  loading: false,
  error: null,
  lastFetched: null,
};

// Utility function to ensure user interactions are initialized
const ensureUserInteraction = (state: CampaignState, campaignId: string): UserInteraction => {
  if (!state.userInteractions[campaignId]) {
    state.userInteractions[campaignId] = {
      liked: false,
      pendingLike: false,
      participated: false,
      pendingParticipation: false,
    };
  }
  return state.userInteractions[campaignId];
};

// Utility function to reset pending flags
const resetPendingFlags = (state: CampaignState, campaignId: string): void => {
  if (state.userInteractions[campaignId]) {
    state.userInteractions[campaignId].pendingLike = false;
    state.userInteractions[campaignId].pendingParticipation = false;
  }
};

// Utility function to store previous state before optimistic updates
const storePreviousState = (state: CampaignState, campaignId: string): void => {
  const interaction = ensureUserInteraction(state, campaignId);
  interaction.previousState = {
    liked: interaction.liked,
    participated: interaction.participated,
    timestamp: Date.now(),
  };
};

// Helper function for making API requests - avoids double slash issues
const makeApiRequest = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  // Ensure endpoint doesn't start with a slash
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

  // Create the URL properly
  const apiUrl = baseAdURL.endsWith('/')
    ? `${baseAdURL}${sanitizedEndpoint}`
    : `${baseAdURL}/${sanitizedEndpoint}`;

  // Make the API call
  return fetch(apiUrl, options);
};

// Helper function to extract user interactions from campaign data
const extractUserInteractions = (
  campaigns: Campaign[],
  userId: string
): { [campaignId: string]: { liked: boolean; participated: boolean } } => {
  const interactions: { [campaignId: string]: { liked: boolean; participated: boolean } } = {};

  campaigns.forEach((campaign) => {
    if (campaign && campaign.id) {
      const isLiked = Array.isArray(campaign.likers) && campaign.likers.includes(userId);
      const isParticipated =
        Array.isArray(campaign.participants) && campaign.participants.includes(userId);

      interactions[campaign.id] = {
        liked: isLiked,
        participated: isParticipated,
      };
    }
  });

  return interactions;
};

// Async thunks
export const fetchCampaigns = createAsyncThunk(
  'campaigns/fetchCampaigns',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const accessToken = await getDataFromAsyncStorage('accessToken');
      const refreshToken = (await getDataFromAsyncStorage('refreshToken')) || '';
      const email = (await getDataFromAsyncStorage('email')) || '';
      const userId = (await getDataFromAsyncStorage('id')) || '';

      // console.log('USER IDDD:', userId);

      const response = await makeApiRequest('campaign/display', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-user-token': refreshToken,
          'x-user-email': email,
        },
      });

      if (!response.ok) {
        const errorMessage = `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const campaigns = data.data;

      // Extract and update user interactions if we have a userId
      if (userId) {
        const interactions = extractUserInteractions(campaigns, userId);
        if (Object.keys(interactions).length > 0) {
          dispatch(setUserInteractions(interactions));
        }
      }

      return campaigns;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchCampaignById = createAsyncThunk(
  'campaigns/fetchCampaignById',
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      const accessToken = await getDataFromAsyncStorage('accessToken');
      const refreshToken = (await getDataFromAsyncStorage('refreshToken')) || '';
      const email = (await getDataFromAsyncStorage('email')) || '';
      const userId = (await getDataFromAsyncStorage('id')) || '';

      const response = await makeApiRequest(`campaign/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-user-token': refreshToken,
          'x-user-email': email,
        },
      });

      if (!response.ok) {
        const errorMessage = `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const campaign = data.data;

      // Extract and update user interactions for this single campaign
      if (userId) {
        const interactions = extractUserInteractions([campaign], userId);
        if (Object.keys(interactions).length > 0) {
          dispatch(setUserInteractions(interactions));
        }
      }

      return campaign;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(errorMessage);
    }
  }
);

const campaignSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    likeCampaignOptimistic: (state, action: PayloadAction<Payloadz>) => {
      const { campaignId, likersId } = action.payload;

      try {
        // Store previous state for potential rollback
        storePreviousState(state, campaignId);

        // Initialize userInteractions if not present
        const interaction = ensureUserInteraction(state, campaignId);

        // Update userInteractions
        interaction.liked = true;
        interaction.pendingLike = true;

        // Update campaigns array
        const campaignIndex = state.campaigns.findIndex((c) => c.id === campaignId);
        if (campaignIndex >= 0) {
          const campaign = { ...state.campaigns[campaignIndex] };
          if (!campaign.likers) {
            campaign.likers = [];
          }
          if (!campaign.likers.includes(likersId)) {
            campaign.likers.push(likersId);
            campaign.likersCount = (campaign.likersCount || 0) + 1;
          }
          state.campaigns[campaignIndex] = campaign;
        }

        // Update activeCampaign
        if (state.activeCampaign && state.activeCampaign.id === campaignId) {
          if (!state.activeCampaign.likers) {
            state.activeCampaign.likers = [];
          }
          if (!state.activeCampaign.likers.includes(likersId)) {
            state.activeCampaign.likers.push(likersId);
            state.activeCampaign.likersCount = (state.activeCampaign.likersCount || 0) + 1;
          }
        }
      } catch (error) {
        console.error('Error in likeCampaignOptimistic:', error);
      }
    },

    unlikeCampaignOptimistic: (state, action: PayloadAction<Payloadz>) => {
      const { campaignId, likersId } = action.payload;

      try {
        // Store previous state for potential rollback
        storePreviousState(state, campaignId);

        // Initialize userInteractions if not present
        const interaction = ensureUserInteraction(state, campaignId);

        // Update userInteractions
        interaction.liked = false;
        interaction.pendingLike = true;

        // Update campaigns array
        const campaignIndex = state.campaigns.findIndex((c) => c.id === campaignId);
        if (campaignIndex >= 0) {
          const campaign = { ...state.campaigns[campaignIndex] };
          if (campaign.likers) {
            campaign.likers = campaign.likers.filter((id) => id !== likersId);
            campaign.likersCount = Math.max(0, (campaign.likersCount || 0) - 1);
          }
          state.campaigns[campaignIndex] = campaign;
        }

        // Update activeCampaign
        if (state.activeCampaign && state.activeCampaign.id === campaignId) {
          if (state.activeCampaign.likers) {
            state.activeCampaign.likers = state.activeCampaign.likers.filter(
              (id) => id !== likersId
            );
            state.activeCampaign.likersCount = Math.max(
              0,
              (state.activeCampaign.likersCount || 0) - 1
            );
          }
        }
      } catch (error) {
        console.error(error);
      }
    },

    participateCampaignOptimistic: (state, action: PayloadAction<JoinPayload>) => {
      const { campaignId, userId } = action.payload;

      try {
        // Store previous state for potential rollback
        storePreviousState(state, campaignId);

        // Initialize userInteractions if not present
        const interaction = ensureUserInteraction(state, campaignId);

        // Update userInteractions
        interaction.participated = true;
        interaction.pendingParticipation = true;

        // Update campaigns array
        const campaignIndex = state.campaigns.findIndex((c) => c.id === campaignId);
        if (campaignIndex >= 0) {
          const campaign = { ...state.campaigns[campaignIndex] };
          if (!campaign.participants) {
            campaign.participants = [];
          }
          if (!campaign.participants.includes(userId)) {
            campaign.participants.push(userId);
            campaign.participantsCount = (campaign.participantsCount || 0) + 1;
          }
          state.campaigns[campaignIndex] = campaign;
        }

        // Update activeCampaign
        if (state.activeCampaign && state.activeCampaign.id === campaignId) {
          if (!state.activeCampaign.participants) {
            state.activeCampaign.participants = [];
          }
          if (!state.activeCampaign.participants.includes(userId)) {
            state.activeCampaign.participants.push(userId);
            state.activeCampaign.participantsCount =
              (state.activeCampaign.participantsCount || 0) + 1;
          }
        }
      } catch (error) {
        console.error(error);
      }
    },

    unparticipateCampaignOptimistic: (state, action: PayloadAction<JoinPayload>) => {
      const { campaignId, userId } = action.payload;

      try {
        // Store previous state for potential rollback
        storePreviousState(state, campaignId);

        // Initialize userInteractions if not present
        const interaction = ensureUserInteraction(state, campaignId);

        // Update userInteractions
        interaction.participated = false;
        interaction.pendingParticipation = true;

        // Update campaigns array
        const campaignIndex = state.campaigns.findIndex((c) => c.id === campaignId);
        if (campaignIndex >= 0) {
          const campaign = { ...state.campaigns[campaignIndex] };
          if (campaign.participants) {
            campaign.participants = campaign.participants.filter((id) => id !== userId);
            campaign.participantsCount = Math.max(0, (campaign.participantsCount || 0) - 1);
          }
          state.campaigns[campaignIndex] = campaign;
        }

        // Update activeCampaign
        if (state.activeCampaign && state.activeCampaign.id === campaignId) {
          if (state.activeCampaign.participants) {
            state.activeCampaign.participants = state.activeCampaign.participants.filter(
              (id) => id !== userId
            );
            state.activeCampaign.participantsCount = Math.max(
              0,
              (state.activeCampaign.participantsCount || 0) - 1
            );
          }
        }
      } catch (error) {
        console.error(error);
      }
    },

    confirmCampaignAction: (
      state,
      action: PayloadAction<{
        campaignId: string;
        action: 'like' | 'unlike' | 'participate' | 'unparticipate';
      }>
    ) => {
      const { campaignId, action: actionType } = action.payload;

      try {
        const interaction = state.userInteractions[campaignId];
        if (!interaction) {
          return;
        }

        if (actionType === 'like' || actionType === 'unlike') {
          interaction.pendingLike = false;

          // Clear previous state after successful confirmation
          delete interaction.previousState;
        } else if (actionType === 'participate' || actionType === 'unparticipate') {
          interaction.pendingParticipation = false;

          // Clear previous state after successful confirmation
          delete interaction.previousState;
        }
      } catch (error) {
        console.error(error);
      }
    },

    rollbackCampaignAction: (
      state,
      action: PayloadAction<{
        campaignId: string;
        userId: string;
        action: 'like' | 'unlike' | 'participate' | 'unparticipate';
      }>
    ) => {
      const { campaignId, userId, action: actionType } = action.payload;

      try {
        const interaction = ensureUserInteraction(state, campaignId);

        // Use stored previous state if available for precise rollback
        if (interaction.previousState) {
          interaction.liked = interaction.previousState.liked;
          interaction.participated = interaction.previousState.participated;

          // Reset pending flags
          interaction.pendingLike = false;
          interaction.pendingParticipation = false;

          // Clear previous state after rollback
          delete interaction.previousState;

          // Update campaign data based on the restored state
          updateCampaignAfterRollback(
            state,
            campaignId,
            userId,
            interaction.liked,
            interaction.participated
          );
        } else {
          // Fallback to traditional rollback if no previous state is available

          if (actionType === 'like') {
            interaction.liked = false;
            interaction.pendingLike = false;
            updateCampaignAfterRollback(state, campaignId, userId, false, interaction.participated);
          } else if (actionType === 'unlike') {
            interaction.liked = true;
            interaction.pendingLike = false;
            updateCampaignAfterRollback(state, campaignId, userId, true, interaction.participated);
          } else if (actionType === 'participate') {
            interaction.participated = false;
            interaction.pendingParticipation = false;
            updateCampaignAfterRollback(state, campaignId, userId, interaction.liked, false);
          } else if (actionType === 'unparticipate') {
            interaction.participated = true;
            interaction.pendingParticipation = false;
            updateCampaignAfterRollback(state, campaignId, userId, interaction.liked, true);
          }
        }
      } catch (error) {
        console.error(error);
      }
    },

    setUserInteractions: (
      state,
      action: PayloadAction<{ [campaignId: string]: { liked: boolean; participated: boolean } }>
    ) => {
      const serverInteractions = action.payload;

      try {
        Object.entries(serverInteractions).forEach(([campaignId, interaction]) => {
          const currentInteraction = state.userInteractions[campaignId] || {
            liked: false,
            pendingLike: false,
            participated: false,
            pendingParticipation: false,
          };

          // Only update if there's no pending action
          if (!currentInteraction.pendingLike) {
            currentInteraction.liked = interaction.liked;
          }

          if (!currentInteraction.pendingParticipation) {
            currentInteraction.participated = interaction.participated;
          }

          state.userInteractions[campaignId] = currentInteraction;
        });
      } catch (error) {
        console.error(error);
      }
    },

    // Utility action to reset pending flags if they get stuck
    resetPendingStateForCampaign: (state, action: PayloadAction<string>) => {
      const campaignId = action.payload;

      if (state.userInteractions[campaignId]) {
        resetPendingFlags(state, campaignId);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action: PayloadAction<Campaign[]>) => {
        state.campaigns = action.payload;
        state.loading = false;
        state.lastFetched = Date.now();
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch campaigns';
      })
      .addCase(fetchCampaignById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCampaignById.fulfilled, (state, action: PayloadAction<Campaign>) => {
        try {
          state.activeCampaign = action.payload;
          const campaignIndex = state.campaigns.findIndex((c) => c.id === action.payload.id);
          if (campaignIndex >= 0) {
            const existingCampaign = state.campaigns[campaignIndex];
            if (JSON.stringify(existingCampaign) !== JSON.stringify(action.payload)) {
              state.campaigns[campaignIndex] = action.payload;
            }
          } else {
            state.campaigns.push(action.payload);
          }
          state.loading = false;
        } catch (error) {
          console.error(error);
        }
      })
      .addCase(fetchCampaignById.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch campaign';
      })
      .addCase(setActiveCampaign, (state, action) => {
        state.activeCampaign = action.payload;
      });
  },
});

// Helper function to update campaign data after a rollback
function updateCampaignAfterRollback(
  state: CampaignState,
  campaignId: string,
  userId: string,
  isLiked: boolean,
  isParticipated: boolean
): void {
  // Update campaigns array
  const campaignIndex = state.campaigns.findIndex((c) => c.id === campaignId);
  if (campaignIndex >= 0) {
    const campaign = { ...state.campaigns[campaignIndex] };

    // Handle like status
    if (isLiked) {
      // Ensure user is in likers list
      if (!campaign.likers) campaign.likers = [];
      if (!campaign.likers.includes(userId)) {
        campaign.likers.push(userId);
        campaign.likersCount = (campaign.likersCount || 0) + 1;
      }
    } else {
      // Ensure user is not in likers list
      if (campaign.likers) {
        campaign.likers = campaign.likers.filter((id) => id !== userId);
        campaign.likersCount = Math.max(0, (campaign.likersCount || 0) - 1);
      }
    }

    // Handle participation status
    if (isParticipated) {
      // Ensure user is in participants list
      if (!campaign.participants) campaign.participants = [];
      if (!campaign.participants.includes(userId)) {
        campaign.participants.push(userId);
        campaign.participantsCount = (campaign.participantsCount || 0) + 1;
      }
    } else {
      // Ensure user is not in participants list
      if (campaign.participants) {
        campaign.participants = campaign.participants.filter((id) => id !== userId);
        campaign.participantsCount = Math.max(0, (campaign.participantsCount || 0) - 1);
      }
    }

    state.campaigns[campaignIndex] = campaign;
  }

  // Update active campaign if it's the same one
  if (state.activeCampaign && state.activeCampaign.id === campaignId) {
    // Handle like status
    if (isLiked) {
      // Ensure user is in likers list
      if (!state.activeCampaign.likers) state.activeCampaign.likers = [];
      if (!state.activeCampaign.likers.includes(userId)) {
        state.activeCampaign.likers.push(userId);
        state.activeCampaign.likersCount = (state.activeCampaign.likersCount || 0) + 1;
      }
    } else {
      // Ensure user is not in likers list
      if (state.activeCampaign.likers) {
        state.activeCampaign.likers = state.activeCampaign.likers.filter((id) => id !== userId);
        state.activeCampaign.likersCount = Math.max(0, (state.activeCampaign.likersCount || 0) - 1);
      }
    }

    // Handle participation status
    if (isParticipated) {
      // Ensure user is in participants list
      if (!state.activeCampaign.participants) state.activeCampaign.participants = [];
      if (!state.activeCampaign.participants.includes(userId)) {
        state.activeCampaign.participants.push(userId);
        state.activeCampaign.participantsCount = (state.activeCampaign.participantsCount || 0) + 1;
      }
    } else {
      // Ensure user is not in participants list
      if (state.activeCampaign.participants) {
        state.activeCampaign.participants = state.activeCampaign.participants.filter(
          (id) => id !== userId
        );
        state.activeCampaign.participantsCount = Math.max(
          0,
          (state.activeCampaign.participantsCount || 0) - 1
        );
      }
    }
  }
}

export const {
  likeCampaignOptimistic,
  unlikeCampaignOptimistic,
  participateCampaignOptimistic,
  unparticipateCampaignOptimistic,
  confirmCampaignAction,
  rollbackCampaignAction,
  setUserInteractions,
  resetPendingStateForCampaign,
} = campaignSlice.actions;

// Selectors
export const selectAllCampaigns = (state: RootState) => state.campaigns.campaigns;
export const selectActiveCampaign = (state: RootState) => state.campaigns.activeCampaign;
export const selectCampaignById = (state: RootState, campaignId: string) =>
  state.campaigns.campaigns.find((campaign: Campaign) => campaign.id === campaignId);
export const selectIsLoading = (state: RootState) => state.campaigns.loading;
export const selectError = (state: RootState) => state.campaigns.error;

// Memoized selector for user interactions
const getUserInteractions = (state: RootState) => state.campaigns.userInteractions;
const getCampaignId = (_: RootState, campaignId: string) => campaignId;

export const selectUserInteraction = createSelector(
  [getUserInteractions, getCampaignId],
  (userInteractions, campaignId) => {
    const interaction = userInteractions[campaignId] || {
      liked: false,
      pendingLike: false,
      participated: false,
      pendingParticipation: false,
    };

    return interaction;
  }
);

// New selector to check if there are any pending actions for a campaign
export const selectHasPendingActions = createSelector(
  [getUserInteractions, getCampaignId],
  (userInteractions, campaignId) => {
    const interaction = userInteractions[campaignId];
    if (!interaction) return false;
    return interaction.pendingLike || interaction.pendingParticipation;
  }
);

export const selectLastFetched = (state: RootState) => state.campaigns.lastFetched;

// New selector to check if campaign has stale pending actions (over 5 minutes old)
export const selectHasStalePendingActions = createSelector(
  [getUserInteractions, getCampaignId],
  (userInteractions, campaignId) => {
    const interaction = userInteractions[campaignId];
    if (!interaction) return false;
    if (!interaction.pendingLike && !interaction.pendingParticipation) return false;

    // Check if the pending action is stale
    const timestamp = interaction.previousState?.timestamp || 0;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return now - timestamp > fiveMinutes;
  }
);

// Create a memoized selector for campaign with user interaction data
export const selectCampaignWithInteraction = createSelector(
  [
    (state: RootState, campaignId: string) => selectCampaignById(state, campaignId),
    (state: RootState, campaignId: string) => selectUserInteraction(state, campaignId),
  ],
  (campaign, interaction) => {
    if (!campaign) return null;
    return {
      ...campaign,
      userInteraction: interaction,
    };
  }
);

export default campaignSlice.reducer;
