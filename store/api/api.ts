import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseURL, baseAdURL } from '../../utils/config/baseUrl';
import {
  getDataFromAsyncStorage,
  deleteDataFromAsyncStorage,
  saveDataToAsyncStorage,
  getJSONFromAsyncStorage,
  saveJSONToAsyncStorage,
} from '../../utils/localStorage';
import { setIsAuth, logOut } from '../slices/isAuthSlice';
import { IUser, IUserResponse } from '~/app/interfaces/interfaces';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  data: IUser;
}

interface CampaignResponse {
  data: Campaign[];
  message: string;
  status: number;
}

interface LikeCampaignResponse {
  likers: string[];
  [key: string]: any;
}

interface JoinCampaignResponse {
  participants: string[];
  [key: string]: any;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  participants: null | any[];
  likers: null | any[];
  poyntReward: string;
  business: {
    id: string;
    name: string;
    logo: string;
  };
  tasks: {
    social: string;
    interaction: string;
    custom: string;
  };
  adType: string;
  engagementGoal: string;
  campaignStatus: string;
  mediaUrl: string;
  targetLocation: {
    enabled: boolean;
    country: string;
    city: string;
  };
  cta: {
    text: string;
    url: string;
  };
  budget: string;
  reached: number;
  costPerReach: string;
  linkClick: number;
  amountSpent: string;
  paymentMethod: null | string;
  transactionhash: null | string;
  createdAt: string;
  updatedAt: string;
}

interface SendDataArgs {
  url: string;
  data: Record<string, any>;
  type: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

// Only cache join status since it's critical for UX flow
const CAMPAIGN_JOINS_KEY = 'campaignJoins';

// prepare headers for API requests
const prepareHeaders = async (headers: Headers) => {
  const accessToken = await getDataFromAsyncStorage('accessToken');
  const refreshToken = await getDataFromAsyncStorage('refreshToken');
  const email = await getDataFromAsyncStorage('email');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('x-user-token', refreshToken || '');
    headers.set('x-user-email', email || '');
  }
  return headers;
};

const mainBaseQuery = fetchBaseQuery({
  baseUrl: baseURL,
  prepareHeaders: async (headers, { getState }) => {
    return await prepareHeaders(headers);
  },
});

const adBaseQuery = fetchBaseQuery({
  baseUrl: baseAdURL,
  prepareHeaders: async (headers, { getState }) => {
    return await prepareHeaders(headers);
  },
});

const dynamicBaseQuery = async (args: any, api: any, extraOptions: any): Promise<any> => {
  let isCampaignApi = false;
  let finalArgs = args;

  if (typeof args === 'string' && args.startsWith('campaign:')) {
    isCampaignApi = true;
    finalArgs = args.substring(9);
  } else if (typeof args === 'object' && args.url && args.url.startsWith('campaign:')) {
    isCampaignApi = true;
    finalArgs = { ...args, url: args.url.substring(9) };
  }

  const baseQueryToUse = isCampaignApi ? adBaseQuery : mainBaseQuery;
  let result = await baseQueryToUse(finalArgs, api, extraOptions);

  // Handle auth errors
  if (
    (result.error && result.error.status === 403) ||
    (result.error && result.error.status === 401)
  ) {
    // Always use the main base URL for token refresh
    const refreshResult = await mainBaseQuery('auth/refreshToken', api, extraOptions);

    if (refreshResult.data) {
      const { accessToken, refreshToken, data } = refreshResult.data as AuthResponse;

      // Update the Redux store with the new token
      api.dispatch(
        setIsAuth({
          isAuth: true,
          accessToken,
          refreshToken,
          user: data,
        })
      );
      await saveDataToAsyncStorage('accessToken', accessToken);
      await saveDataToAsyncStorage('refreshToken', refreshToken);
      await saveDataToAsyncStorage('id', data._id);
      await saveDataToAsyncStorage('email', data.email);
      await saveDataToAsyncStorage('name', data.name);
      await saveDataToAsyncStorage('role', data.role);

      // Retry the initial query with the new token
      result = await baseQueryToUse(finalArgs, api, extraOptions);
    } else {
      // Log out the user if token refresh fails
      api.dispatch(logOut());
      await deleteDataFromAsyncStorage('accessToken');
      await deleteDataFromAsyncStorage('refreshToken');
      await deleteDataFromAsyncStorage('id');
      await deleteDataFromAsyncStorage('role');
      await deleteDataFromAsyncStorage('email');
      await deleteDataFromAsyncStorage('name');
    }
  }

  return result;
};

// Helper function to update join status in cache - only cache what's necessary for UX flow
export const updateCachedJoinStatus = async (
  campaignId: string,
  joined: boolean
): Promise<void> => {
  try {
    // Update joins cache
    const joinsData = (await getJSONFromAsyncStorage(CAMPAIGN_JOINS_KEY)) || {};
    joinsData[campaignId] = joined;
    await saveJSONToAsyncStorage(CAMPAIGN_JOINS_KEY, joinsData);
  } catch (error) {
    console.error('Error updating cached join status:', error);
  }
};

// Function to get cached join status for a campaign
export const getCachedJoinStatus = async (campaignId: string): Promise<boolean> => {
  try {
    const joinsData = (await getJSONFromAsyncStorage(CAMPAIGN_JOINS_KEY)) || {};
    return joinsData[campaignId] || false;
  } catch (error) {
    console.error('Error getting cached join status:', error);
    return false;
  }
};

// Create the API slice
export const api = createApi({
  reducerPath: 'request',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['User', 'Campaign'],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getUser: builder.query<IUserResponse, void>({
      query: () => `user/`,
      providesTags: ['User'],
    }),

    sendData: builder.mutation<void, SendDataArgs>({
      query: ({ url, data, type }) => ({
        url,
        method: type,
        body: data,
      }),
      invalidatesTags: ['User'],
      transformResponse: (response: any) => response,
    }),

    getDisplayCampaigns: builder.query<CampaignResponse, void>({
      query: () => `campaign:campaign/display`,
      providesTags: ['Campaign'],
    }),

    // Like/Unlike a Campaign

    likeCampaign: builder.mutation<LikeCampaignResponse, { likerId: string; campaignId: string }>({
      query: ({ likerId, campaignId }) => ({
        url: `campaign:campaign/like/${likerId}/${campaignId}`,
        method: 'PATCH',
      }),
      // Transform the response to fix duplicated user IDs in likers array
      transformResponse: (response: any) => {
        if (response && response.likers && Array.isArray(response.likers)) {
          // Normalize user IDs (remove quotes)
          const normalizedLikers = response.likers.map((liker: any) => {
            if (typeof liker === 'string') {
              return liker.replace(/^"(.*)"$/, '$1').replace(/\\/g, '');
            }
            return liker;
          });

          // Remove duplicates using Set
          const uniqueLikers = [...new Set(normalizedLikers)];

          // Update response with deduplicated likers
          return { ...response, likers: uniqueLikers };
        }
        return response;
      },
      // Preserve campaign order by using pessimistic updates
      async onQueryStarted({ likerId, campaignId }, { dispatch, queryFulfilled, getState }) {
        try {
          // Wait for the mutation to complete
          const { data } = await queryFulfilled;

          // Get the current campaign query data from the cache
          const state = getState() as any;
          const campaignsData = state.request.queries['getDisplayCampaigns(undefined)']?.data;

          // If we have campaign data in the cache, update just the liked campaign
          if (campaignsData) {
            dispatch(
              api.util.updateQueryData('getDisplayCampaigns', undefined, (draft) => {
                // Find the campaign by ID and update only its likers array
                const campaignToUpdate = draft.data.find((c) => c.id === campaignId);
                if (campaignToUpdate) {
                  campaignToUpdate.likers = data.likers;
                }
              })
            );
          }
        } catch (error) {
          console.error('Error processing like campaign mutation:', error);
        }
      },
      invalidatesTags: (result) => (result ? [] : ['Campaign']), // Only invalidate on error
    }),

    // Join/Leave a Campaign
    joinCampaign: builder.mutation<JoinCampaignResponse, { userId: string; campaignId: string }>({
      query: ({ userId, campaignId }) => ({
        url: `campaign:campaign/join/${userId}/${campaignId}`,
        method: 'PATCH',
      }),
      // Add minimal caching for joined status since it affects UX flow
      async onQueryStarted({ userId, campaignId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          // After successful API call, update join status in cache
          if (data && data.participants) {
            const participantsArray = data.participants || [];
            const userJoined =
              Array.isArray(participantsArray) &&
              (participantsArray.includes(userId) || participantsArray.includes(`"${userId}"`));

            // Only cache the joined status
            await updateCachedJoinStatus(campaignId, userJoined);
          }
        } catch (error) {
          console.error('Join campaign error:', error);
        }
      },
      invalidatesTags: ['Campaign'],
    }),
  }),
});

export const {
  useGetUserQuery,
  useGetDisplayCampaignsQuery,
  useLikeCampaignMutation,
  useJoinCampaignMutation,
  useSendDataMutation,
} = api;
