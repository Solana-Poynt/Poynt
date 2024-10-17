import { configureStore, combineReducers } from '@reduxjs/toolkit';

import { api } from './api/api';

// Reducers
import isAuthReducer from './slices/isAuthSlice';

// RootState and AppDispatch types
export type RootState = ReturnType<typeof rootReducers>;
export type AppDispatch = typeof store.dispatch;

// Combine reducers
const rootReducers = combineReducers({
  isAuth: isAuthReducer,
  [api.reducerPath]: api.reducer,
});

// Configure the store
export const store = configureStore({
  reducer: rootReducers,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

// Export types for hooks like useSelector and useDispatch
export default store;
