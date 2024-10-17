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
export const checkAuthStatus = () => async (dispatch: any) => {
  const accessToken = await getDataFromAsyncStorage('accessToken');
  const refreshToken = await getDataFromAsyncStorage('refreshToken');
  if (accessToken && refreshToken) {
    dispatch(setIsAuth({ accessToken, refreshToken, user: {} as IUser }));
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

      // Remove tokens from AsyncStorage
      deleteDataFromAsyncStorage('accessToken');
      deleteDataFromAsyncStorage('refreshToken');
    },
  },
});

// / Exporting the actions
export const { setIsAuth, logOut } = isAuthSlice.actions;

// // Async action creator for logging out
// export const logOutAsync = () => async (dispatch: any) => {
//   try {
//     await Promise.all([
//       deleteDataFromAsyncStorage('accessToken'),
//       deleteDataFromAsyncStorage('refreshToken'),
//     ]);
//     dispatch(logOut());
//   } catch (error) {
//     console.error('Error during logout:', error);
//   }
// };

// Export the reducer
export default isAuthSlice.reducer;
