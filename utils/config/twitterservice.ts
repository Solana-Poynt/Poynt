import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { mapTaskType } from '../TaskFormatter';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

// Configuration constants
const TWITTER_CLIENT_ID = 'bk42enJZLWg2dUxNRTB1N0FpNms6MTpjaQ';
const TOKEN_ENDPOINT = 'https://api.x.com/2/oauth2/token';
const AUTH_ENDPOINT = 'https://x.com/i/oauth2/authorize';
const USERS_ENDPOINT = 'https://api.x.com/2/users/me';
const FOLLOWS_ENDPOINT = 'https://api.x.com/2/users';
const REDIRECT_URI = 'poynt://screens/profile/social-profile';
const REQUEST_TIMEOUT = 20000;

// Add global flag for auth in progress that survives navigation
declare global {
  interface Window {
    authInProgress?: boolean;
  }
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'x_access_token',
  REFRESH_TOKEN: 'x_refresh_token',
  TOKEN_EXPIRY: 'x_token_expiry',
  ACCOUNT: 'x_account',
  AUTH_VERIFIER: 'x_auth_verifier',
  AUTH_STATE: 'x_auth_state',
} as const;

// OAuth scopes
const SCOPES = [
  'users.read',
  'tweet.read',
  'tweet.write',
  'follows.read',
  'follows.write',
  'like.read',
  'like.write',
  'offline.access',
] as const;

// Types
type AuthStatus = 'idle' | 'authenticating' | 'success' | 'error';

interface Account {
  username: string;
  userId: string;
  profileImageUrl: string | null;
}

interface UserInfo {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface AuthCallbackResult {
  success: boolean;
  error?: string;
}

/**
 * Hook for Twitter/X authentication
 */
const useTwitterAuth = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [authFlowActive, setAuthFlowActive] = useState(!!window.authInProgress);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    window.authInProgress ? 'authenticating' : 'idle'
  );

  // Refs for managing side effects
  const timeoutRef = useRef<NodeJS.Timeout[]>([]);
  const lastConnectAttempt = useRef<number>(0);
  const codeVerifierRef = useRef<string | null>(null);
  const initInProgress = useRef<boolean>(false);

  // Restore auth flow state if needed
  useEffect(() => {
    if (window.authInProgress && !authFlowActive) {
      setAuthFlowActive(true);
      setAuthStatus('authenticating');
    }

    return () => {
      timeoutRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  // Logging functions
  const logInfo = useCallback((message: string, data?: any) => {
    if (__DEV__) {
      if (data) {
        console.log(`[TwitterAuth] ${message}`, data);
      } else {
        console.log(`[TwitterAuth] ${message}`);
      }
    }
  }, []);

  const logError = useCallback((message: string, error?: any) => {
    if (__DEV__) console.error(`[TwitterAuth] ${message}`, error || '');
  }, []);

  /**
   * Clears all Twitter-related data from storage
   */
  const clearAllTwitterStorage = useCallback(async (): Promise<void> => {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (err) {
      logError('Failed to clear Twitter storage', err);
    }
  }, [logError]);

  /**
   * Validates stored auth data
   */
  const validateStoredData = useCallback(async (): Promise<boolean> => {
    try {
      const [accessToken, refreshToken, tokenExpiry, accountData] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY,
        STORAGE_KEYS.ACCOUNT,
      ]);

      // Check if all required data exists
      if (!accessToken[1] || !refreshToken[1] || !tokenExpiry[1] || !accountData[1]) {
        await clearAllTwitterStorage();
        return false;
      }

      // Check token expiry
      const expiryTime = parseInt(tokenExpiry[1], 10);
      if (isNaN(expiryTime) || expiryTime < Date.now()) {
        await clearAllTwitterStorage();
        return false;
      }

      // Validate account data format
      try {
        JSON.parse(accountData[1]);
      } catch {
        await clearAllTwitterStorage();
        return false;
      }

      return true;
    } catch (err) {
      logError('Failed to validate stored data', err);
      await clearAllTwitterStorage();
      return false;
    }
  }, [clearAllTwitterStorage, logError]);

  /**
   * URL-safe Base64 encoding
   */
  const URLEncode = useCallback((str: string): string => {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }, []);

  /**
   * Generates a code verifier for PKCE
   */
  const generateCodeVerifier = useCallback(async (): Promise<string> => {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      return URLEncode(Buffer.from(randomBytes).toString('base64'));
    } catch (err) {
      logError('Error generating code verifier', err);
      throw new Error('Failed to generate code verifier');
    }
  }, [URLEncode, logError]);

  /**
   * Generates a code challenge from a verifier
   */
  const generateCodeChallenge = useCallback(
    async (verifier: string): Promise<string> => {
      try {
        const digest = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          verifier,
          { encoding: Crypto.CryptoEncoding.BASE64 }
        );
        return URLEncode(digest);
      } catch (err) {
        logError('Error generating code challenge', err);
        throw new Error('Failed to generate code challenge');
      }
    },
    [URLEncode, logError]
  );

  /**
   * Saves auth tokens to storage
   */
  const saveTokens = useCallback(
    async (accessToken: string, refreshToken: string, expiresIn: number): Promise<void> => {
      try {
        const expiry = Date.now() + expiresIn * 1000;
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
          [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
          [STORAGE_KEYS.TOKEN_EXPIRY, expiry.toString()],
        ]);
      } catch (err) {
        logError('Failed to save tokens', err);
        throw new Error('Failed to save tokens');
      }
    },
    [logError]
  );

  /**
   * Clears auth tokens from storage
   */
  const clearTokens = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY,
      ]);
    } catch (err) {
      logError('Failed to clear tokens', err);
    }
  }, [logError]);

  /**
   * Creates a timeout that is tracked for cleanup
   */
  const safeTimeout = useCallback((callback: () => void, ms: number): NodeJS.Timeout => {
    const id = setTimeout(() => {
      callback();
      timeoutRef.current = timeoutRef.current.filter((t) => t !== id);
    }, ms);
    timeoutRef.current.push(id);
    return id;
  }, []);

  /**
   * Refreshes an access token using a refresh token
   */
  const refreshAccessToken = useCallback(
    async (refreshToken: string): Promise<string | null> => {
      try {
        return await new Promise((resolve, reject) => {
          const timeoutId = safeTimeout(() => {
            reject(new Error('Refresh token request timed out'));
          }, REQUEST_TIMEOUT);

          fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
              client_id: TWITTER_CLIENT_ID,
            }).toString(),
          })
            .then(async (response) => {
              clearTimeout(timeoutId);

              if (!response.ok) {
                await clearTokens();
                resolve(null);
                return;
              }

              const data: TokenResponse = await response.json();

              if (data.access_token) {
                await saveTokens(
                  data.access_token,
                  data.refresh_token || refreshToken,
                  data.expires_in || 7200
                );
                resolve(data.access_token);
              } else {
                await clearTokens();
                resolve(null);
              }
            })
            .catch(async (err) => {
              clearTimeout(timeoutId);
              await clearTokens();
              logError('Refresh token error', err);
              resolve(null);
            });
        });
      } catch (err) {
        logError('Unexpected refresh token error', err);
        await clearTokens();
        return null;
      }
    },
    [saveTokens, clearTokens, safeTimeout, logError]
  );

  /**
   * Gets a valid access token (refreshes if needed)
   */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const [accessToken, refreshToken, expiry] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY,
      ]);

      const token = accessToken[1];
      const refresh = refreshToken[1];
      const expiryTime = expiry[1] ? parseInt(expiry[1], 10) : null;

      if (!token) return null;

      // Refresh if token expires in less than 5 minutes
      if (expiryTime && expiryTime - Date.now() < 5 * 60 * 1000 && refresh) {
        return await refreshAccessToken(refresh);
      }

      return token;
    } catch (err) {
      logError('Failed to get access token', err);
      return null;
    }
  }, [refreshAccessToken, logError]);

  /**
   * Fetches user info from Twitter API
   */
  const getUserInfo = useCallback(
    async (token: string, retries = 3, baseRetryDelay = 1000): Promise<UserInfo | null> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const url = `${USERS_ENDPOINT}?user.fields=id,name,username,profile_image_url`;

          const response = await new Promise<Response>((resolve, reject) => {
            const timeoutId = safeTimeout(() => {
              reject(new Error('User info request timed out'));
            }, REQUEST_TIMEOUT);

            fetch(url, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
              .then((res) => {
                clearTimeout(timeoutId);
                resolve(res);
              })
              .catch(reject);
          });

          if (!response.ok) {
            const responseText = await response.text();

            // Handle unauthorized error by refreshing token
            if (response.status === 401 && attempt < retries) {
              const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
              if (refreshToken) {
                const newToken = await refreshAccessToken(refreshToken);
                if (newToken) {
                  token = newToken;
                  continue;
                }
              }
            }

            throw new Error(`Twitter API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data.data) {
            throw new Error('No user data in response');
          }

          return data.data as UserInfo;
        } catch (err: any) {
          logError(`Failed to get user info (attempt ${attempt}/${retries})`, err);

          if (attempt === retries) return null;

          // Exponential backoff with jitter
          const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15 range for jitter
          const delay = Math.floor(baseRetryDelay * Math.pow(2, attempt - 1) * jitter);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      return null;
    },
    [safeTimeout, refreshAccessToken, logError]
  );

  /**
   * Lookup Twitter user by username
   */
  const getUserByUsername = useCallback(
    async (username: string, token: string): Promise<{ id: string; username: string } | null> => {
      try {
        // Remove @ if present
        const cleanUsername = username.replace(/^@/, '');
        const url = `${FOLLOWS_ENDPOINT}/by/username/${cleanUsername}?user.fields=id,username`;

        logInfo(`Looking up user by username: ${cleanUsername}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          logError(`User lookup failed: ${response.status}`, await response.text());
          return null;
        }

        const data = await response.json();

        if (!data.data) {
          logError('No data in user lookup response');
          return null;
        }

        return {
          id: data.data.id,
          username: data.data.username,
        };
      } catch (error) {
        logError('Error looking up user', error);
        return null;
      }
    },
    [logInfo, logError]
  );

  /**
   * Check if current user follows a target user
   */
  const checkFollowingById = useCallback(
    async (sourceId: string, targetId: string, token: string): Promise<boolean> => {
      try {
        const url = `${FOLLOWS_ENDPOINT}/${sourceId}/following?user.fields=id&max_results=1000`;

        logInfo(`Checking if ${sourceId} follows ${targetId}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          logError(`Follow check failed: ${response.status}`, await response.text());
          return false;
        }

        const data = await response.json();

        if (!data.data || !Array.isArray(data.data)) {
          logError('Invalid response format for following check');
          return false;
        }

        // Check if targetId is in the following list
        return data.data.some((user: any) => user.id === targetId);
      } catch (error) {
        logError('Error checking follow status', error);
        return false;
      }
    },
    [logInfo, logError]
  );

  /**
   * Saves code verifier to AsyncStorage to persist across redirects
   */
  const saveAuthData = useCallback(
    async (verifier: string, state: string): Promise<void> => {
      try {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.AUTH_VERIFIER, verifier],
          [STORAGE_KEYS.AUTH_STATE, state],
        ]);
      } catch (err) {
        logError('Failed to save auth data', err);
      }
    },
    [logError]
  );

  /**
   * Loads code verifier from AsyncStorage
   */
  const loadAuthData = useCallback(async (): Promise<{
    verifier: string | null;
    state: string | null;
  }> => {
    try {
      const [verifier, state] = await AsyncStorage.multiGet([
        STORAGE_KEYS.AUTH_VERIFIER,
        STORAGE_KEYS.AUTH_STATE,
      ]);
      return {
        verifier: verifier[1],
        state: state[1],
      };
    } catch (err) {
      logError('Failed to load auth data', err);
      return { verifier: null, state: null };
    }
  }, [logError]);

  /**
   * Initializes the auth state
   */
  const initialize = useCallback(async () => {
    if (loading || initInProgress.current) return;

    initInProgress.current = true;
    setLoading(true);

    try {
      const isValid = await validateStoredData();
      if (!isValid) {
        setIsConnected(false);
        setAccount(null);
        setAuthStatus('idle');
        return;
      }

      const [xAccount, accessToken, tokenExpiry] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCOUNT,
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY,
      ]);

      if (!xAccount[1] || !accessToken[1] || !tokenExpiry[1]) {
        await clearAllTwitterStorage();
        setIsConnected(false);
        setAccount(null);
        setAuthStatus('idle');
        return;
      }

      const expiryTime = parseInt(tokenExpiry[1], 10);
      if (expiryTime < Date.now()) {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const newToken = await refreshAccessToken(refreshToken);
          if (!newToken) {
            await clearAllTwitterStorage();
            setIsConnected(false);
            setAccount(null);
            setAuthStatus('idle');
            return;
          }
        } else {
          await clearAllTwitterStorage();
          setIsConnected(false);
          setAccount(null);
          setAuthStatus('idle');
          return;
        }
      }

      const token = await getAccessToken();
      if (!token) {
        await clearAllTwitterStorage();
        setIsConnected(false);
        setAccount(null);
        setAuthStatus('idle');
        return;
      }

      const userInfo = await getUserInfo(token);
      if (!userInfo) {
        await clearAllTwitterStorage();
        setIsConnected(false);
        setAccount(null);
        setAuthStatus('error');
        setError('Failed to verify account information');
        return;
      }

      try {
        const parsedAccount: Account = JSON.parse(xAccount[1]);
        if (parsedAccount.userId !== userInfo.id) {
          await clearAllTwitterStorage();
          setIsConnected(false);
          setAccount(null);
          setAuthStatus('idle');
          return;
        }

        // Update profile image URL if it has changed
        if (parsedAccount.profileImageUrl !== userInfo.profile_image_url) {
          parsedAccount.profileImageUrl = userInfo.profile_image_url || null;
          await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(parsedAccount));
        }

        const accountData: Account = {
          username: parsedAccount.username,
          userId: parsedAccount.userId,
          profileImageUrl: parsedAccount.profileImageUrl,
        };

        setAccount(accountData);
        setIsConnected(true);
        setAuthStatus('success');
      } catch (err) {
        logError('Error parsing account data', err);
        await clearAllTwitterStorage();
        setIsConnected(false);
        setAccount(null);
        setAuthStatus('error');
        setError('Invalid account data');
      }
    } catch (err) {
      logError('Initialize error', err);
      await clearAllTwitterStorage();
      setIsConnected(false);
      setAccount(null);
      setAuthStatus('error');
      setError('Authentication initialization failed');
    } finally {
      setLoading(false);
      initInProgress.current = false;
    }
  }, [
    loading,
    getUserInfo,
    clearTokens,
    refreshAccessToken,
    getAccessToken,
    clearAllTwitterStorage,
    validateStoredData,
    logError,
  ]);

  /**
   * Initiates the Twitter authentication flow
   */
  const connectTwitter = useCallback(async () => {
    // Prevent rapid re-attempts
    if (loading || Date.now() - lastConnectAttempt.current < 5000) {
      return null;
    }

    // Clear previous auth data
    codeVerifierRef.current = null;

    lastConnectAttempt.current = Date.now();
    setLoading(true);
    setError(null);
    setAuthStatus('authenticating');
    setAuthFlowActive(true);

    // Save for persistence across potential app state changes
    window.authInProgress = true;

    try {
      await clearAllTwitterStorage();

      // Generate PKCE challenge
      const verifier = await generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      const state = Crypto.randomUUID().replace(/-/g, '');

      // Store in memory
      codeVerifierRef.current = verifier;

      // Also store in AsyncStorage for persistence across redirects
      await saveAuthData(verifier, state);

      // Build authorization URL
      const authUrl = new URL(AUTH_ENDPOINT);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', TWITTER_CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.append('scope', SCOPES.join(' '));
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('code_challenge', challenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');

      const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), REDIRECT_URI);

      if (result.type !== 'success' || !result.url) {
        setAuthStatus('error');
        setError(result.type === 'cancel' ? 'Authentication cancelled' : 'Authentication failed');
        await clearAllTwitterStorage();
        await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_VERIFIER, STORAGE_KEYS.AUTH_STATE]);
        codeVerifierRef.current = null;
        window.authInProgress = false;
        throw new Error('Authentication cancelled or failed');
      }

      return result;
    } catch (err: any) {
      logError('Connect error', err);
      setError(err.message || 'Failed to start authentication');
      setAuthStatus('error');
      setAuthFlowActive(false);
      await clearAllTwitterStorage();
      codeVerifierRef.current = null;
      window.authInProgress = false;
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    generateCodeVerifier,
    generateCodeChallenge,
    clearAllTwitterStorage,
    saveAuthData,
    logError,
  ]);

  /**
   * Handles the callback from the Twitter auth flow
   */
  const handleAuthCallback = useCallback(
    async (url: string): Promise<AuthCallbackResult> => {
      setLoading(true);
      setError(null);

      try {
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get('code');
        const authError = parsedUrl.searchParams.get('error');
        const errorDescription = parsedUrl.searchParams.get('error_description');
        const state = parsedUrl.searchParams.get('state');

        // Handle error response
        if (authError) {
          const errorMsg = errorDescription || 'Authentication failed';
          setAuthStatus('error');
          setError(errorMsg);
          await clearAllTwitterStorage();
          codeVerifierRef.current = null;
          window.authInProgress = false;
          return { success: false, error: errorMsg };
        }

        // Validate code presence
        if (!code) {
          const errorMsg = 'No authorization code provided';
          setAuthStatus('error');
          setError(errorMsg);
          await clearAllTwitterStorage();
          codeVerifierRef.current = null;
          window.authInProgress = false;
          return { success: false, error: errorMsg };
        }

        // Validate state parameter
        if (!state) {
          const errorMsg = 'Missing state parameter';
          setAuthStatus('error');
          setError(errorMsg);
          await clearAllTwitterStorage();
          codeVerifierRef.current = null;
          window.authInProgress = false;
          return { success: false, error: errorMsg };
        }

        // Load verifier and state from storage if not in memory
        let verifier = codeVerifierRef.current;
        if (!verifier) {
          const storedAuth = await loadAuthData();

          if (storedAuth.verifier) {
            verifier = storedAuth.verifier;
            codeVerifierRef.current = storedAuth.verifier;
          } else {
            const errorMsg = 'Missing code verifier';
            setAuthStatus('error');
            setError(errorMsg);
            await clearAllTwitterStorage();
            await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_VERIFIER, STORAGE_KEYS.AUTH_STATE]);
            window.authInProgress = false;
            return { success: false, error: errorMsg };
          }
        }

        // Exchange code for token
        const response = await new Promise<Response>((resolve, reject) => {
          const timeoutId = safeTimeout(() => {
            reject(new Error('Token exchange request timed out'));
          }, REQUEST_TIMEOUT);

          fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              grant_type: 'authorization_code',
              client_id: TWITTER_CLIENT_ID,
              redirect_uri: REDIRECT_URI,
              code_verifier: verifier as string,
            }).toString(),
          })
            .then((res) => {
              clearTimeout(timeoutId);
              resolve(res);
            })
            .catch(reject);
        });

        // Handle token response
        const data: TokenResponse = await response.json();

        if (!response.ok || !data.access_token) {
          const errorMsg = `Token exchange failed: ${data.error_description || response.status}`;
          setAuthStatus('error');
          setError(errorMsg);
          await clearAllTwitterStorage();
          codeVerifierRef.current = null;
          return { success: false, error: errorMsg };
        }

        // Save tokens
        await saveTokens(data.access_token, data.refresh_token || '', data.expires_in || 7200);

        // Fetch user info
        const userInfo = await getUserInfo(data.access_token);
        if (!userInfo) {
          await clearAllTwitterStorage();
          const errorMsg = 'Failed to retrieve user info';
          setError(errorMsg);
          setAuthStatus('error');
          codeVerifierRef.current = null;
          return { success: false, error: errorMsg };
        }

        // Create account object
        const xAccount: Account = {
          username: `@${userInfo.username}`,
          userId: userInfo.id,
          profileImageUrl: userInfo.profile_image_url || null,
        };

        // Save account info
        await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(xAccount));
        setAccount(xAccount);
        setIsConnected(true);
        setAuthStatus('success');

        // Clean up auth data
        await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_VERIFIER, STORAGE_KEYS.AUTH_STATE]);
        codeVerifierRef.current = null;

        return { success: true };
      } catch (err: any) {
        logError('Auth callback error', err);
        const errorMsg = err.message || 'Failed to connect X account';
        setError(errorMsg);
        await clearAllTwitterStorage();
        setIsConnected(false);
        setAccount(null);
        setAuthStatus('error');
        codeVerifierRef.current = null;
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
        setAuthFlowActive(false);
        // Clear global auth in progress flag
        window.authInProgress = false;
      }
    },
    [getUserInfo, saveTokens, safeTimeout, clearAllTwitterStorage, loadAuthData, logError]
  );

  /**
   * Disconnects the Twitter account
   */
  const disconnectTwitter = useCallback(async (): Promise<boolean> => {
    if (loading) return false;

    setLoading(true);
    setError(null);

    try {
      await clearAllTwitterStorage();
      setAccount(null);
      setIsConnected(false);
      setAuthFlowActive(false);
      setAuthStatus('idle');
      codeVerifierRef.current = null;
      return true;
    } catch (err) {
      logError('Disconnect error', err);
      setError('Failed to disconnect');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loading, clearAllTwitterStorage, logError]);

  /**
   * Resets the auth state
   */
  const resetAuth = useCallback(async (): Promise<void> => {
    try {
      await clearAllTwitterStorage();
      setAccount(null);
      setIsConnected(false);
      setAuthFlowActive(false);
      setAuthStatus('idle');
      setError(null);
      codeVerifierRef.current = null;
    } catch (err) {
      logError('Reset auth error', err);
    }
  }, [clearAllTwitterStorage, logError]);

  /**
   * Provides debug information about the current auth state
   * Only used in development mode
   */
  const debugAuthState = useCallback(async (): Promise<boolean> => {
    if (!__DEV__) return false;

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const twitterKeys = allKeys.filter((key) => key.startsWith('x_'));
      const keyValues = await AsyncStorage.multiGet(twitterKeys);
      const state: Record<string, any> = {};

      keyValues.forEach(([key, value]) => {
        if (key === STORAGE_KEYS.ACCESS_TOKEN && value) {
          state[key] = value.substring(0, 10) + '...';
        } else if (key === STORAGE_KEYS.REFRESH_TOKEN && value) {
          state[key] = value.substring(0, 10) + '...';
        } else if (key === STORAGE_KEYS.TOKEN_EXPIRY && value) {
          const timestamp = parseInt(value, 10);
          state[key] = new Date(timestamp).toISOString();
          state[key + '_remaining'] = Math.round((timestamp - Date.now()) / 1000) + 's';
        } else if (key === STORAGE_KEYS.ACCOUNT && value) {
          try {
            state[key] = JSON.parse(value);
          } catch {
            state[key] = value;
          }
        } else {
          state[key] = value;
        }
      });

      // Include in-memory state
      state['in_memory_state'] = {
        loading,
        error,
        isConnected,
        authStatus,
        authFlowActive,
      };

      state['in_memory_code_verifier'] = codeVerifierRef.current
        ? codeVerifierRef.current.substring(0, 10) + '...'
        : null;

      console.log('[TwitterAuth] DEBUG AUTH STATE', state);
      return true;
    } catch (err) {
      logError('Debug error', err);
      return false;
    }
  }, [loading, error, isConnected, authStatus, authFlowActive, logError]);

  /**
   * Extract username from Twitter URL
   */
  const extractUsernameFromUrl = useCallback((url: string): string | null => {
    try {
      const cleanUrl = url.trim();
      const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);

      if (urlObj.hostname === 'x.com' || urlObj.hostname === 'twitter.com') {
        // Format: twitter.com/username or twitter.com/username/status/123
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          return pathParts[0].toLowerCase();
        }
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Check if a proof URL references the original tweet
   */
  // const isRelatedToOriginalTweet = useCallback((proofUrl: string, originalUrl: string): boolean => {
  //   try {
  //     // Extract status ID from original URL (if it has one)
  //     const originalUrlObj = new URL(
  //       originalUrl.startsWith('http') ? originalUrl : `https://${originalUrl}`
  //     );
  //     const originalPathParts = originalUrlObj.pathname.split('/').filter(Boolean);
  //     let originalStatusId = null;

  //     if (originalPathParts.length >= 3 && originalPathParts[1] === 'status') {
  //       originalStatusId = originalPathParts[2];
  //     }

  //     // If original URL doesn't have a status ID, we can't verify relation
  //     if (!originalStatusId) return true;

  //     // Check if proof URL contains the original status ID
  //     return proofUrl.includes(originalStatusId);
  //   } catch {
  //     return false;
  //   }
  // }, []);

  /**
   * Check if a user follows another user using the Twitter API
   */
  const checkFollowStatus = useCallback(
    async (targetUsername: string): Promise<boolean> => {
      try {
        // Get account data and access token
        const accountData = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT);
        if (!accountData) return false;

        const token = await getAccessToken();
        if (!token) return false;

        // REAL IMPLEMENTATION FOR PAID TIER API
        // // 1. First get the target user's ID by username
        // const targetUser = await getUserByUsername(targetUsername, token);
        // if (!targetUser) {
        //   logError(`Could not find user with username: ${targetUsername}`);
        //   return false;
        // }
        // 2. Check if the authenticated user follows the target user
        // const isFollowing = await checkFollowingById(account.userId, targetUser.id, token);
        // logInfo(
        //   `Follow check result: ${account.username} following ${targetUser.username}: ${isFollowing}`
        // );
        // return isFollowing;
        // FREE TIER IMPLEMENTATION - MOCK VERSION
        // logInfo(`[Mock] Checking if ${account.username} follows ${targetUsername}`);
        // Always return true since we can't check with free tier
        return true;
      } catch (error) {
        logError('Failed to check follow status', error);
        return false;
      }
    },
    [getAccessToken, getUserByUsername, checkFollowingById, logInfo, logError]
  );

  /**
   * Verify a Twitter task
   */
  const verifyTask = useCallback(
    async (taskType: string, taskUrl: string, proofUrl?: string) => {
      try {
        setLoading(true);

        const normalizedTaskType = ['social', 'interaction', 'custom'].includes(taskType)
          ? mapTaskType(taskType, taskUrl)
          : taskType;

        // Get user's Twitter account info
        const accountData = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT);
        if (!accountData) {
          return { completed: false, error: 'Twitter account not connected' };
        }

        const account = JSON.parse(accountData);
        const username = account.username.replace('@', '');

        // Normalize task URL
        const normalizedTaskUrl = taskUrl.trim();
        if (!normalizedTaskUrl) {
          return { completed: false, error: 'Invalid task URL' };
        }

        // Handle verification based on normalized task type
        switch (normalizedTaskType) {
          case 'follow': {
            const targetUsername = extractUsernameFromUrl(normalizedTaskUrl);
            if (!targetUsername) {
              return { completed: false, error: 'Invalid account URL' };
            }

            const isFollowing = await checkFollowStatus(targetUsername);
            return {
              completed: isFollowing,
              error: isFollowing ? null : `You're not following @${targetUsername}`,
            };
          }

          case 'like':
            // For likes, we'll just trust the user completed the task with free tier
            return { completed: true };

          case 'comment':
          case 'retweet': {
            // If no proof provided, request it
            if (!proofUrl) {
              return {
                completed: false,
                error: `Please provide a link to your ${normalizedTaskType}`,
                requiresProof: true,
              };
            }

            // Normalize proof URL
            let normalizedProofUrl = proofUrl.trim();
            if (!normalizedProofUrl.startsWith('http')) {
              normalizedProofUrl = `https://${normalizedProofUrl}`;
            }

            // Verify proof contains user's username
            const containsUsername = normalizedProofUrl
              .toLowerCase()
              .includes(username.toLowerCase());

            // Check if it references the original tweet
            // const isRelated = isRelatedToOriginalTweet(normalizedProofUrl, normalizedTaskUrl);

            if (containsUsername) {
              return { completed: true };
            } else if (!containsUsername) {
              return {
                completed: false,
                error: `The link doesn't appear to be from your account (@${username}). Please provide your own ${normalizedTaskType} link.`,
              };
            } else {
              return {
                completed: false,
                error: `The proof doesn't seem to be related to the required tweet. Please ${normalizedTaskType} the correct post.`,
              };
            }
          }

          default:
            return { completed: false, error: `Unknown task type: ${normalizedTaskType}` };
        }
      } catch (error) {
        logError('Task verification error', error);
        return { completed: false, error: 'Verification failed. Please try again.' };
      } finally {
        setLoading(false);
      }
    },
    [extractUsernameFromUrl, checkFollowStatus, logError]
  );

  return useMemo(
    () => ({
      connectTwitter,
      handleAuthCallback,
      disconnectTwitter,
      initialize,
      resetAuth,
      debugAuthState,
      verifyTask,
      loading,
      error,
      isConnected,
      account,
      authFlowActive,
      authStatus,
    }),
    [
      connectTwitter,
      handleAuthCallback,
      disconnectTwitter,
      initialize,
      resetAuth,
      debugAuthState,
      verifyTask,
      loading,
      error,
      isConnected,
      account,
      authFlowActive,
      authStatus,
    ]
  );
};

export default useTwitterAuth;
