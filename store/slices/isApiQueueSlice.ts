import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { baseAdURL } from '~/utils/config/baseUrl';
import { confirmCampaignAction, rollbackCampaignAction } from './isCampaignSlice';
import { getDataFromAsyncStorage } from '../../utils/localStorage';

export type CampaignRequestType =
  | 'campaign/like'
  | 'campaign/unlike'
  | 'campaign/participate'
  | 'campaign/unparticipate';

export interface QueuedRequest {
  id: string;
  type: CampaignRequestType;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data: any;
  metadata?: {
    campaignId?: string;
    userId?: string;
    timestamp: number;
    retryCount?: number;
    lastRetryTime?: number;
    priority?: number;
  };
  createdAt: number;
}

interface ApiQueueState {
  pendingRequests: QueuedRequest[];
  lastSyncTimestamp: number | null;
  isSyncing: boolean;
  syncErrors: { [requestId: string]: string };
  isProcessingPaused: boolean;
}

const initialState: ApiQueueState = {
  pendingRequests: [],
  lastSyncTimestamp: null,
  isSyncing: false,
  syncErrors: {},
  isProcessingPaused: false,
};

/**
 * Calculate the backoff delay for retries using exponential backoff
 * @param retryCount Current retry count
 * @returns Delay in milliseconds
 */
const calculateBackoffTime = (retryCount: number): number => {
  const baseDelay = 1000; // 1 second
  const maxDelay = 60000; // 1 minute
  const calculatedDelay = baseDelay * Math.pow(2, retryCount);
  return Math.min(calculatedDelay, maxDelay);
};

/**
 * Clean request data to remove large nested objects for storage efficiency
 * @param data Input data to clean
 * @returns Cleaned data with large nested objects removed
 */
const sanitizeRequestData = (data: any): any => {
  if (!data) return data;

  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeRequestData(item));
  }

  const result: Record<string, any> = {};
  for (const key in data) {
    const value = data[key];
    // Keep primitive values and small objects
    if (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      result[key] = value;
    } else if (typeof value === 'object' && Object.keys(value).length < 5) {
      // Keep small objects but clean them recursively
      result[key] = sanitizeRequestData(value);
    } else {
      // For large objects, just keep a reference
      result[key] = '[Large Object]';
    }
  }

  return result;
};

/**
 * Async thunk to queue an API request with optional immediate execution
 */
export const queueApiRequest = createAsyncThunk(
  'apiQueue/queueRequest',
  async (request: Omit<QueuedRequest, 'id' | 'createdAt'>, { getState, dispatch }) => {
    const { network } = getState() as RootState;
    const isConnected = network.isConnected;

    // Create a full request with ID and timestamp
    const fullRequest: QueuedRequest = {
      ...request,
      id: `${request.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),

      data: sanitizeRequestData(request.data),
      // Ensure metadata has timestamp
      metadata: {
        ...request.metadata,
        timestamp: Date.now(),
        priority: getPriorityForRequestType(request.type),
      },
    };

    // Execute immediately if online
    if (isConnected) {
      try {
        const response = await executeApiRequest(fullRequest);

        // Confirm action in campaign state if this is a campaign action
        if (request.metadata?.campaignId) {
          let actionType: 'like' | 'unlike' | 'participate' | 'unparticipate';
          switch (request.type) {
            case 'campaign/like':
              actionType = 'like';
              break;
            case 'campaign/unlike':
              actionType = 'unlike';
              break;
            case 'campaign/participate':
              actionType = 'participate';
              break;
            case 'campaign/unparticipate':
              actionType = 'unparticipate';
              break;
            default:
              throw new Error('Unknown action type');
          }

          dispatch(
            confirmCampaignAction({
              campaignId: request.metadata.campaignId,
              action: actionType,
            })
          );
        }

        return { request: fullRequest, response, executed: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
          request: fullRequest,
          executed: false,
          error: errorMessage,
        };
      }
    }

    return { request: fullRequest, executed: false };
  }
);

/**
 * Process the entire API request queue
 */
export const processQueue = createAsyncThunk(
  'apiQueue/processQueue',
  async (_, { getState, dispatch }) => {
    const { apiQueue, network } = getState() as RootState;
    const { pendingRequests, isProcessingPaused } = apiQueue;
    const isConnected = network.isConnected;

    // Skip processing if offline or processing paused
    if (!isConnected) {
      return [];
    }

    if (isProcessingPaused) {
      return [];
    }

    if (pendingRequests.length === 0) {
      return [];
    }

    // Sort requests by priority (higher numbers first) and then by creation time (oldest first)
    const sortedRequests = [...pendingRequests].sort((a, b) => {
      const priorityA = a.metadata?.priority || 0;
      const priorityB = b.metadata?.priority || 0;

      if (priorityB !== priorityA) {
        return priorityB - priorityA;
      }

      return a.createdAt - b.createdAt;
    });

    const results: any[] = [];
    const maxRetries = 3;
    const batchableRequests: { [key: string]: QueuedRequest[] } = {};

    // Group batchable requests by endpoint
    sortedRequests.forEach((request) => {
      if (canBatchRequest(request.type)) {
        const key = `${request.endpoint}_${request.method}`;
        if (!batchableRequests[key]) {
          batchableRequests[key] = [];
        }
        batchableRequests[key].push(request);
      }
    });

    // First process batched requests
    for (const [key, requests] of Object.entries(batchableRequests)) {
      if (requests.length > 1) {
        try {
          const batchResponse = await processBatchRequests(requests, dispatch);

          // Mark all batch requests as successful
          requests.forEach((req) => {
            results.push({
              id: req.id,
              success: true,
              response: batchResponse,
              requestItem: req,
            });
          });

          // Remove these from the sorted list since they've been processed
          const requestIds = new Set(requests.map((r) => r.id));
          sortedRequests.filter((r) => !requestIds.has(r.id));
        } catch (error) {
          // Leave these in the sorted list to be processed individually
        }
      }
    }

    // Process remaining individual requests
    for (const requestItem of sortedRequests) {
      // Skip requests that were already processed in a batch
      if (results.some((r) => r.id === requestItem.id)) {
        continue;
      }

      const retryCount = requestItem.metadata?.retryCount || 0;

      // Check if we've reached max retries
      if (retryCount >= maxRetries) {
        // Rollback the optimistic update since we're giving up
        if (requestItem.metadata?.campaignId && requestItem.metadata?.userId) {
          let actionType: 'like' | 'unlike' | 'participate' | 'unparticipate';
          switch (requestItem.type) {
            case 'campaign/like':
              actionType = 'like';
              break;
            case 'campaign/unlike':
              actionType = 'unlike';
              break;
            case 'campaign/participate':
              actionType = 'participate';
              break;
            case 'campaign/unparticipate':
              actionType = 'unparticipate';
              break;
            default:
              continue;
          }

          dispatch(
            rollbackCampaignAction({
              campaignId: requestItem.metadata.campaignId,
              userId: requestItem.metadata.userId,
              action: actionType,
            })
          );
        }

        results.push({
          id: requestItem.id,
          success: false,
          error: 'Max retries reached',
          requestItem,
        });
        continue;
      }

      // Check for backoff time if this is a retry
      if (retryCount > 0) {
        const lastRetryTime = requestItem.metadata?.lastRetryTime || 0;
        const backoffTime = calculateBackoffTime(retryCount);
        const currentTime = Date.now();

        if (lastRetryTime > 0 && currentTime - lastRetryTime < backoffTime) {
          continue; // Skip this request for now
        }
      }

      // Update retry information
      const updatedRequest: any = {
        ...requestItem,
        metadata: {
          ...requestItem.metadata,
          retryCount: retryCount + 1,
          lastRetryTime: Date.now(),
        },
      };

      try {
        const response = await executeApiRequest(updatedRequest);

        // Update campaign state on success
        if (updatedRequest.metadata?.campaignId) {
          let actionType: 'like' | 'unlike' | 'participate' | 'unparticipate';
          switch (updatedRequest.type) {
            case 'campaign/like':
              actionType = 'like';
              break;
            case 'campaign/unlike':
              actionType = 'unlike';
              break;
            case 'campaign/participate':
              actionType = 'participate';
              break;
            case 'campaign/unparticipate':
              actionType = 'unparticipate';
              break;
            default:
              continue;
          }

          dispatch(
            confirmCampaignAction({
              campaignId: updatedRequest.metadata.campaignId,
              action: actionType,
            })
          );
        }

        results.push({
          id: updatedRequest.id,
          success: true,
          response,
          requestItem: updatedRequest,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.push({
          id: updatedRequest.id,
          success: false,
          error: errorMessage,
          requestItem: updatedRequest,
        });
      }
    }

    return results;
  }
);

/**
 * Clean up old queue items that exceed the maximum age
 */
export const cleanupOldQueueItems = createAsyncThunk(
  'apiQueue/cleanupOldQueueItems',
  async (_, { getState, dispatch }) => {
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    const state = getState() as RootState;
    const { pendingRequests } = state.apiQueue;
    const now = Date.now();

    const oldItemIds = pendingRequests
      .filter((req) => now - req.createdAt > MAX_AGE_MS)
      .map((req) => req.id);

    if (oldItemIds.length > 0) {
      oldItemIds.forEach((id) => {
        dispatch(removeFromQueue(id));
      });
    } else {
    }

    return oldItemIds;
  }
);

/**
 * Execute a single API request
 */
async function executeApiRequest(request: QueuedRequest) {
  const { endpoint, method, data } = request;

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getDataFromAsyncStorage('accessToken')}`,
        'x-user-token': (await getDataFromAsyncStorage('refreshToken')) || '',
        'x-user-email': (await getDataFromAsyncStorage('email')) || '',
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    // FIX: Ensure endpoint doesn't start with a slash, and baseAdURL doesn't end with a slash
    const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const apiUrl = baseAdURL.endsWith('/')
      ? `${baseAdURL}${sanitizedEndpoint}`
      : `${baseAdURL}/${sanitizedEndpoint}`;

    const response = await fetch(apiUrl, options);

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = errorText || `Request failed with status ${response.status}`;

      throw new Error(errorMessage);
    }

    const responseData = await response.json();

    return responseData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    throw error;
  }
}
/**
 * Process multiple requests in a batch (if backend supports it)
 */
async function processBatchRequests(requests: QueuedRequest[], dispatch: any): Promise<any> {
  // NOTE: This requires backend support for batch operations
  // If your backend doesn't support this, you'll need to modify this function

  const firstRequest = requests[0];
  const batchEndpoint = `batch/${firstRequest.type.split('/')[0]}`;

  const batchData = requests.map((req) => ({
    id: req.id,
    action: req.type.split('/')[1], // Extract 'like', 'unlike', etc.
    data: req.data,
    metadata: req.metadata,
  }));

  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getDataFromAsyncStorage('accessToken')}`,
      'x-user-token': (await getDataFromAsyncStorage('refreshToken')) || '',
      'x-user-email': (await getDataFromAsyncStorage('email')) || '',
    },
    body: JSON.stringify({ batch: batchData }),
  };
  const sanitizedEndpoint = batchEndpoint.startsWith('/')
    ? batchEndpoint.substring(1)
    : batchEndpoint;
  const apiUrl = baseAdURL.endsWith('/')
    ? `${baseAdURL}${sanitizedEndpoint}`
    : `${baseAdURL}/${sanitizedEndpoint}`;

  const response = await fetch(apiUrl, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Batch request failed with status ${response.status}`);
  }

  const responseData = await response.json();

  // Confirm all successful requests
  for (const req of requests) {
    if (req.metadata?.campaignId) {
      let actionType: 'like' | 'unlike' | 'participate' | 'unparticipate';
      switch (req.type) {
        case 'campaign/like':
          actionType = 'like';
          break;
        case 'campaign/unlike':
          actionType = 'unlike';
          break;
        case 'campaign/participate':
          actionType = 'participate';
          break;
        case 'campaign/unparticipate':
          actionType = 'unparticipate';
          break;
        default:
          continue;
      }

      dispatch(
        confirmCampaignAction({
          campaignId: req.metadata.campaignId,
          action: actionType,
        })
      );
    }
  }

  return responseData;
}

/**
 * Get priority level for different request types
 */
function getPriorityForRequestType(type: CampaignRequestType): number {
  switch (type) {
    case 'campaign/participate':
    case 'campaign/unparticipate':
      return 2; // Higher priority
    case 'campaign/like':
    case 'campaign/unlike':
      return 1; // Standard priority
    default:
      return 0; // Default priority
  }
}

/**
 * Check if a request type can be batched
 */
function canBatchRequest(type: CampaignRequestType): boolean {
  // Specify which request types can be batched
  return ['campaign/like', 'campaign/unlike'].includes(type);
}

const apiQueueSlice = createSlice({
  name: 'apiQueue',
  initialState,
  reducers: {
    removeFromQueue: (state, action: PayloadAction<string>) => {
      state.pendingRequests = state.pendingRequests.filter(
        (request) => request.id !== action.payload
      );
      // Also remove any stored errors for this request
      delete state.syncErrors[action.payload];
    },

    clearQueue: (state) => {
      state.pendingRequests = [];
      state.syncErrors = {};
    },

    clearSyncErrors: (state) => {
      // formatLog(LogLevel.INFO, 'clearSyncErrors: Clearing sync errors');
      state.syncErrors = {};
      // formatLog(LogLevel.INFO, 'clearSyncErrors: Sync errors cleared');
    },

    pauseQueueProcessing: (state) => {
      // formatLog(LogLevel.INFO, 'pauseQueueProcessing: Pausing queue processing');
      state.isProcessingPaused = true;
    },

    resumeQueueProcessing: (state) => {
      // formatLog(LogLevel.INFO, 'resumeQueueProcessing: Resuming queue processing');
      state.isProcessingPaused = false;
    },

    retryRequest: (state, action: PayloadAction<string>) => {
      const requestId = action.payload;
      const requestIndex = state.pendingRequests.findIndex((req) => req.id === requestId);

      if (requestIndex >= 0) {
        // Clone the request and reset retry information
        const request = { ...state.pendingRequests[requestIndex] };
        if (request.metadata) {
          request.metadata.retryCount = 0;
          request.metadata.lastRetryTime = 0;
        }

        // Replace in the array
        state.pendingRequests[requestIndex] = request;

        // Clear any sync errors for this request
        delete state.syncErrors[requestId];
      } else {
        // formatLog(LogLevel.WARN, 'retryRequest: Request not found', { id: requestId });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(queueApiRequest.fulfilled, (state, action) => {
        if (!action.payload.executed) {
          state.pendingRequests.push(action.payload.request);
        }
      })
      .addCase(processQueue.pending, (state) => {
        // formatLog(LogLevel.INFO, 'processQueue.pending: Setting isSyncing to true');
        state.isSyncing = true;
      })
      .addCase(processQueue.fulfilled, (state, action) => {
        try {
          const successfulIds = action.payload
            .filter((result) => result.success)
            .map((result) => result.id);

          // Remove successful requests from the queue
          state.pendingRequests = state.pendingRequests.filter(
            (req) => !successfulIds.includes(req.id)
          );

          // Update retry count and store errors for failed requests
          state.pendingRequests.forEach((req) => {
            const failedItem = action.payload.find((item) => item.id === req.id && !item.success);
            if (failedItem) {
              // Ensure metadata exists
              if (!req.metadata) {
                req.metadata = { timestamp: Date.now(), retryCount: 1 };
              } else {
                req.metadata.retryCount = (req.metadata.retryCount || 0) + 1;
              }

              // Store the error
              state.syncErrors[req.id] = failedItem.error || 'Unknown error';
            }
          });

          state.lastSyncTimestamp = Date.now();
          state.isSyncing = false;
        } catch (error) {}
      })
      .addCase(processQueue.rejected, (state, action) => {
        state.isSyncing = false;
      });
  },
});

export const {
  removeFromQueue,
  clearQueue,
  clearSyncErrors,
  pauseQueueProcessing,
  resumeQueueProcessing,
  retryRequest,
} = apiQueueSlice.actions;

// Selectors
export const selectPendingRequests = (state: RootState) => state.apiQueue.pendingRequests;
export const selectIsSyncing = (state: RootState) => state.apiQueue.isSyncing;
export const selectLastSyncTimestamp = (state: RootState) => state.apiQueue.lastSyncTimestamp;
export const selectSyncErrors = (state: RootState) => state.apiQueue.syncErrors;
export const selectHasPendingRequests = (state: RootState) =>
  state.apiQueue.pendingRequests.length > 0;
export const selectIsProcessingPaused = (state: RootState) => state.apiQueue.isProcessingPaused;

// Selector to get pending requests for a specific campaign
export const selectPendingRequestsForCampaign = createSelector(
  [
    (state: RootState) => state.apiQueue.pendingRequests,
    (_: RootState, campaignId: string) => campaignId,
  ],
  (pendingRequests, campaignId) => {
    return pendingRequests.filter((req) => req.metadata?.campaignId === campaignId);
  }
);
// Selector to get specific request errors
export const selectRequestError = (state: RootState, requestId: string) =>
  state.apiQueue.syncErrors[requestId];

export default apiQueueSlice.reducer;
