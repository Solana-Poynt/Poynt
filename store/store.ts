import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { api } from "./api/api";

// reducers
import isAuthReducer from "./slices/isAuthSlice";

const rootReducers = combineReducers({
  isAuth: isAuthReducer,
  [api.reducerPath]: api.reducer,
});

export const store = configureStore({
  reducer: rootReducers,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});
