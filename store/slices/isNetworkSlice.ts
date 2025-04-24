import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { AppDispatch } from '../store';
import { processQueue, cleanupOldQueueItems } from './isApiQueueSlice';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

export type ConnectionType = 'wifi' | 'cellular' | 'unknown' | 'none';

interface NetworkState {
  isConnected: boolean;
  connectionType: ConnectionType;
  lastConnectedTimestamp: number | null;
  lastDisconnectedTimestamp: number | null;
  isMonitoring: boolean;
}

const initialState: NetworkState = {
  isConnected: true,
  connectionType: 'unknown',
  lastConnectedTimestamp: null,
  lastDisconnectedTimestamp: null,
  isMonitoring: false,
};

/**
 * Map NetInfo connection type to our internal ConnectionType
 */
const mapConnectionType = (state: NetInfoState): ConnectionType => {
  if (!state.isConnected) return 'none';
  switch (state.type) {
    case 'wifi':
      return 'wifi';
    case 'cellular':
      return 'cellular';
    default:
      return 'unknown';
  }
};

// Hold reference to the NetInfo and AppState subscriptions for cleanup
let netInfoUnsubscribe: NetInfoSubscription | null = null;
let appStateSubscription: any = null;

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setNetworkStatus: (
      state,
      action: PayloadAction<{
        isConnected: boolean;
        connectionType: ConnectionType;
      }>
    ) => {
      const wasConnected = state.isConnected;
      state.isConnected = action.payload.isConnected;
      state.connectionType = action.payload.connectionType;

      if (action.payload.isConnected && !wasConnected) {
        state.lastConnectedTimestamp = Date.now();
      } else if (!action.payload.isConnected && wasConnected) {
        state.lastDisconnectedTimestamp = Date.now();
      }
    },

    setMonitoringStatus: (state, action: PayloadAction<boolean>) => {
      state.isMonitoring = action.payload;
    },
  },
});

export const { setNetworkStatus, setMonitoringStatus } = networkSlice.actions;

// Selectors
export const selectIsConnected = (state: RootState) => state.network.isConnected;
export const selectConnectionType = (state: RootState) => state.network.connectionType;
export const selectLastConnectedTimestamp = (state: RootState) =>
  state.network.lastConnectedTimestamp;
export const selectLastDisconnectedTimestamp = (state: RootState) =>
  state.network.lastDisconnectedTimestamp;
export const selectIsMonitoring = (state: RootState) => state.network.isMonitoring;

/**
 * Initialize the network listener for connectivity changes
 */
export const initNetworkListener = (dispatch: AppDispatch) => {
  // Clean up existing listeners
  cleanupListeners();

  // Set monitoring status to true
  dispatch(setMonitoringStatus(true));

  // Fetch initial network state
  NetInfo.fetch()
    .then((state) => {
      dispatch(
        setNetworkStatus({
          isConnected: state.isConnected ?? false,
          connectionType: mapConnectionType(state),
        })
      );

      // If connected, check for pending requests
      if (state.isConnected) {
        dispatch((dispatch, getState) => {
          const { apiQueue } = getState() as RootState;
          if (apiQueue.pendingRequests.length > 0) {
            dispatch(processQueue());
          }

          // Clean up any old queue items on startup
          dispatch(cleanupOldQueueItems());

          return null;
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });

  // Set up network state listener
  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    const isNowConnected = state.isConnected ?? false;

    dispatch((dispatch, getState) => {
      const { network } = getState() as RootState;
      const wasConnected = network.isConnected;

      dispatch(
        setNetworkStatus({
          isConnected: isNowConnected,
          connectionType: mapConnectionType(state),
        })
      );

      if (isNowConnected && !wasConnected) {
        dispatch(processQueue()).catch((error) => {
          console.error(error);
        });
      }

      return null;
    });
  });

  // Set up app state listener to detect when app comes to foreground
  appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App has come to the foreground
      dispatch(async (dispatch, getState) => {
        try {
          // Refresh network state when app comes to foreground
          const netInfoState = await NetInfo.fetch();
          const isConnected = netInfoState.isConnected ?? false;

          dispatch(
            setNetworkStatus({
              isConnected,
              connectionType: mapConnectionType(netInfoState),
            })
          );

          const { apiQueue } = getState() as RootState;
          if (isConnected && apiQueue.pendingRequests.length > 0) {
            dispatch(processQueue());
          }

          // Clean up old queue items periodically
          dispatch(cleanupOldQueueItems());
        } catch (error) {
          console.error(error);
        }

        return null;
      });
    }
  });

  // Return cleanup function
  return cleanupListeners;
};

/**
 * Clean up network and app state listeners
 */
function cleanupListeners() {
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

/**
 * Initialize all listeners and queue processing
 * Call this from your app entry point
 */
export const initializeNetworkMonitoring = (dispatch: AppDispatch) => {
  // Initialize network listener
  const cleanup = initNetworkListener(dispatch);

  // Return cleanup function
  return cleanup;
};

export default networkSlice.reducer;
