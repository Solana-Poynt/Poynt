import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getDataFromAsyncStorage,
  saveDataToAsyncStorage,
  deleteDataFromAsyncStorage,
} from '../../utils/localStorage';
import { IUser } from '~/app/interfaces/interfaces';

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
  isAuth: false, // Set to false initially, will be updated when checkAuthStatus is called
  accessToken: null,
  refreshToken: null,
};

// Async function to check authentication status based on stored tokens
async function checkAuthStatus(): Promise<boolean> {
  const accessToken = await getDataFromAsyncStorage('accessToken');
  const refreshToken = await getDataFromAsyncStorage('refreshToken');
  return !!accessToken && !!refreshToken;
}

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
