// isAuthSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getDataFromAsyncStorage,
  saveDataToAsyncStorage,
  deleteDataFromAsyncStorage,
} from '../../utils/localStorage';
import { IUser } from '~/app/interfaces/interfaces';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the types for the state and payloads
interface AuthState {
  isAuth: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

interface SetIsAuthPayload {
  isAuth?: boolean;
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

// Initial state
const initialState: AuthState = {
  isAuth: false,
  accessToken: null,
  refreshToken: null,
};

// Async function to check authentication status based on stored tokens
export const checkAuthStatus = () => async (dispatch: any) => {
  try {
    const accessToken = await getDataFromAsyncStorage('accessToken');
    const refreshToken = await getDataFromAsyncStorage('refreshToken');
    if (accessToken && refreshToken) {
      dispatch(setIsAuth({ accessToken, refreshToken, user: {} as IUser }));
    } else {
      dispatch(logOut()); // Ensure state is cleared if no tokens
    }
  } catch (error) {
    console.error('[isAuthSlice] Error checking auth status:', error);
    dispatch(logOut());
  }
};

// Async action creator for logging out
export const logOutAsync = () => async (dispatch: any) => {
  try {
    console.log('[isAuthSlice] Logging out');
    await AsyncStorage.multiRemove([
      'accessToken',
      'refreshToken',
      'id',
      'email',
      'name',
      'photo',
      'role',
      'x_account',
      'x_access_token',
      'x_refresh_token',
      'x_token_expiry',
      'x_code_verifier',
      'x_code_challenge',
    ]);
    console.log('[isAuthSlice] AsyncStorage cleared');
    dispatch(logOut());
  } catch (error) {
    console.error('[isAuthSlice] Error during logout:', error);
  }
};

// Auth slice
export const isAuthSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setIsAuth: (state: AuthState, action: PayloadAction<SetIsAuthPayload>) => {
      const { accessToken, refreshToken, user } = action.payload;
      state.isAuth = true;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;

      // Save tokens to AsyncStorage
      saveDataToAsyncStorage('accessToken', accessToken);
      saveDataToAsyncStorage('refreshToken', refreshToken);
    },
    logOut: (state: AuthState) => {
      state.isAuth = false;
      state.accessToken = null;
      state.refreshToken = null;
    },
  },
});

// Exporting the actions
export const { setIsAuth, logOut } = isAuthSlice.actions;

// Export the reducer
export default isAuthSlice.reducer;
