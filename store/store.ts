import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api/api';

// Reducers
import isAuthReducer from './slices/isAuthSlice';
import campaignReducer from './slices/isCampaignSlice';
import networkReducer from './slices/isNetworkSlice';
import apiQueueReducer from './slices/isApiQueueSlice';

// Configure persistence for campaign state
const campaignPersistConfig = {
  key: 'campaigns',
  storage: AsyncStorage,
  whitelist: ['campaigns', 'userInteractions', 'lastFetched']
};

// Configure persistence for API queue
const apiQueuePersistConfig = {
  key: 'apiQueue',
  storage: AsyncStorage,
  whitelist: ['pendingRequests', 'lastSyncTimestamp']
};

// Configure persistence for auth state if needed
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'token'] 
};

// Combine reducers with persistence
const rootReducers = combineReducers({
  isAuth: persistReducer(authPersistConfig, isAuthReducer),
  campaigns: persistReducer(campaignPersistConfig, campaignReducer),
  network: networkReducer,
  apiQueue: persistReducer(apiQueuePersistConfig, apiQueueReducer),
  [api.reducerPath]: api.reducer,
});

// RootState and AppDispatch types
export type RootState = ReturnType<typeof rootReducers>;
export type AppDispatch = typeof store.dispatch;

// Configure the store
export const store = configureStore({
  reducer: rootReducers,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
  
        ignoredPaths: ['apiQueue.pendingRequests']
      }
    }).concat(api.middleware),
});

// Create the persistor
export const persistor = persistStore(store);

// Export store and persistor
export default store;