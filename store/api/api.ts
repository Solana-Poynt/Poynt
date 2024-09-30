import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseURL } from '../../utils/config/baseUrl';
import { getDataFromAsyncStorage } from '../../utils/localStorage';
import { setIsAuth, logOut } from '../slices/isAuthSlice';
import { IUser, IUserResponse } from '~/app/interfaces/interfaces';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  data: IUser;
}

interface SendDataArgs {
  url: string;
  data: Record<string, any>;
  type: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

// Define a base query with necessary configurations such as base URL and headers
const baseQuery = fetchBaseQuery({
  baseUrl: baseURL,
  prepareHeaders: async (headers, { getState }) => {
    // Extract required information from the Redux store or AsyncStorage
    const accessToken = await getDataFromAsyncStorage('accessToken');
    const refreshToken = await getDataFromAsyncStorage('refreshToken');
    const email = await getDataFromAsyncStorage('email');

    // Attach authorization headers if accessToken is available
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      headers.set('x-user-token', refreshToken || '');
      headers.set('x-user-email', email || '');
    }
    return headers;
  },
});

// Custom query function that handles token refreshing logic
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any): Promise<any> => {
  let result = await baseQuery(args, api, extraOptions);

  // Check for 403 (Forbidden) or 401 (Unauthorized) errors in the response
  if (
    (result.error && result.error.status === 403) ||
    (result.error && result.error.status === 401)
  ) {
    // Attempt to refresh the access token
    const refreshResult = await baseQuery('auth/refreshToken', api, extraOptions);

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

      // Retry the initial query with the new token
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Log out the user if token refresh fails
      api.dispatch(logOut());
    }
  }

  return result;
};

// Create the API slice
export const api = createApi({
  reducerPath: 'request',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User'],
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
  }),
});

// Hooks to access the endpoints
export const { useGetUserQuery, useSendDataMutation } = api;
