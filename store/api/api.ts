import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseURL, baseAdURL } from '../../utils/config/baseUrl';
import {
  getDataFromAsyncStorage,
  deleteDataFromAsyncStorage,
  saveDataToAsyncStorage,
} from '../../utils/localStorage';
import { setIsAuth, logOut } from '../slices/isAuthSlice';
import { IUser } from '~/app/interfaces/interfaces';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  data: IUser;
}

interface LikeCampaignResponse {
  data?: {
    affected: number;
    generatedMaps: any[];
    raw: any[];
  };
  message: string;
  status: number;
}

interface JoinCampaignResponse {
  participants: string[] | null;
  [key: string]: any;
}

interface LeaderboardResponse {
  data: Array<{
    userId: string;
    name: string;
    poyntBalance: number;
    rank: number;
  }>;
  message: string;
  status: number;
}

interface FundPoyntRequest {
  userId: string;
  poyntValue: number;
}

interface FundPoyntResponse {
  message: string;
  status: number;
}

interface AddEngagementRequest {
  campaignId: string;
}

interface AddEngagementResponse {
  message: string;
  status: number;
}

interface AddTasksDoneResponse {
  message: string;
  status: number;
}

interface SendDataArgs {
  url: string;
  data: Record<string, any>;
  type: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

interface SendDataResponse {
  message: string;
  accessToken?: string;
  refreshToken?: string;
  data?: any;
  status: number;
}

interface CampaignResponse {
  data: Campaign[];
  message: string;
  status: number;
}

export enum Adtype {
  VIDEO_ADS = 'video_ads',
  DISPLAY_ADS = 'display_ads',
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  participants: string[] | null;
  participantsCount: number;
  likers: string[] | null;
  likersCount: number;
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
  adType: Adtype;
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

const throttleFetch = async (input: RequestInfo, init?: RequestInit) => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return fetch(input, init);
};

const mainBaseQuery = fetchBaseQuery({
  baseUrl: baseURL,
  prepareHeaders: async (headers) => {
    const accessToken = await getDataFromAsyncStorage('accessToken');
    const refreshToken = await getDataFromAsyncStorage('refreshToken');
    const email = await getDataFromAsyncStorage('email');

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      headers.set('x-user-token', refreshToken || '');
      headers.set('x-user-email', email || '');
    }
    return headers;
  },
  fetchFn: throttleFetch,
});

const adBaseQuery = fetchBaseQuery({
  baseUrl: baseAdURL,
  prepareHeaders: async (headers) => {
    const accessToken = await getDataFromAsyncStorage('accessToken');
    const refreshToken = await getDataFromAsyncStorage('refreshToken');
    const email = await getDataFromAsyncStorage('email');

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      headers.set('x-user-token', refreshToken || '');
      headers.set('x-user-email', email || '');
    }
    return headers;
  },
  fetchFn: throttleFetch,
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

  if (result.error && (result.error.status === 403 || result.error.status === 401)) {
    const refreshResult = await mainBaseQuery('auth/refreshToken', api, extraOptions);

    if (refreshResult.data) {
      const { accessToken, refreshToken, data } = refreshResult.data as AuthResponse;

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

      result = await baseQueryToUse(finalArgs, api, extraOptions);
    } else {
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

export const api = createApi({
  reducerPath: 'request',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['User', 'Campaign'],
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getUser: builder.query<{ data: IUser }, void>({
      query: () => `user/`,
      providesTags: ['User'],
    }),
    getDisplayCampaigns: builder.query<CampaignResponse, void>({
      query: () => `campaign:campaign/display`,
      providesTags: ['Campaign'],
    }),
    getLeaderboard: builder.query<LeaderboardResponse, void>({
      query: () => `user/leaderboard`,
      providesTags: ['User'],
    }),
    fundPoynt: builder.mutation<FundPoyntResponse, FundPoyntRequest>({
      query: ({ userId, poyntValue }) => ({
        url: `user/fundPoynt`,
        method: 'PATCH',
        body: { userId, poyntValue },
      }),
      invalidatesTags: ['User'],
    }),
    addEngagement: builder.mutation<AddEngagementResponse, AddEngagementRequest>({
      query: ({ campaignId }) => ({
        url: `user/addEngagement`,
        method: 'PATCH',
        body: { campaignId },
      }),
      invalidatesTags: ['Campaign'],
    }),
    addTasksDone: builder.mutation<AddTasksDoneResponse, { campaignId: string; taskIds: number[] }>(
      {
        query: ({ campaignId, taskIds }) => ({
          url: `user/addTasksDone`,
          method: 'PATCH',
          body: { campaignId, taskIds },
        }),
        invalidatesTags: ['Campaign'],
      }
    ),
    sendData: builder.mutation<SendDataResponse, SendDataArgs>({
      query: ({ url, data, type }) => ({
        url,
        method: type,
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUserQuery,
  useGetDisplayCampaignsQuery,
  useGetLeaderboardQuery,
  useFundPoyntMutation,
  useSendDataMutation,
} = api;
