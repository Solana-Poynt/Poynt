import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

const TWITTER_CLIENT_ID = 'bk42enJZLWg2dUxNRTB1N0FpNms6MTpjaQ';

// 2. Add a validation check
if (!TWITTER_CLIENT_ID) {
  console.error('[useTwitterAuth] Missing TWITTER_CLIENT_ID environment variable');
}
const TOKEN_ENDPOINT = 'https://api.x.com/2/oauth2/token';
const AUTH_ENDPOINT = 'https://x.com/i/oauth2/authorize';
const USERS_ENDPOINT = 'https://api.x.com/2/users/me';
const REDIRECT_URI = 'poynt://screens/profile/social-profile';

const SCOPES = [
  'users.read',
  'tweet.read',
  'tweet.write',
  'follows.read',
  'follows.write',
  'like.read',
  'like.write',
  'offline.access',
];

const REQUEST_TIMEOUT = 10000;
const RATE_LIMIT_COOLDOWN = 60 * 60 * 1000; // 1 hour

type TaskType = 'follow' | 'like' | 'retweet' | 'comment' | 'tweet';
type VerificationResult = { completed: boolean; error?: string };
type Account = { username: string; userId: string; profileImageUrl: string | null } | null;

const useTwitterAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<Account>(null);
  const [authFlowActive, setAuthFlowActive] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const isInitialized = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout[]>([]);
  const rateLimitResetRef = useRef<number | null>(null);
  const lastConnectAttempt = useRef<number>(0);

  useEffect(() => {
    return () => {
      timeoutRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const URLEncode = useCallback((str: string): string => {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }, []);

  const generateCodeVerifier = useCallback(async (): Promise<string> => {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      return URLEncode(Buffer.from(randomBytes).toString('base64'));
    } catch (err) {
      if (__DEV__) console.error('[useTwitterAuth] Error generating code verifier:', err);
      throw new Error('Failed to generate code verifier');
    }
  }, [URLEncode]);

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
        if (__DEV__) console.error('[useTwitterAuth] Error generating code challenge:', err);
        throw new Error('Failed to generate code challenge');
      }
    },
    [URLEncode]
  );

  const clearVerifierData = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove(['x_code_verifier', 'x_code_challenge', 'x_auth_state']);
      if (__DEV__) console.log('[useTwitterAuth] Cleared verifier data');
    } catch (err) {
      if (__DEV__) console.error('[useTwitterAuth] Failed to clear verifier data:', err);
    }
  }, []);

  const saveTokens = useCallback(
    async (accessToken: string, refreshToken: string, expiresIn: number): Promise<void> => {
      try {
        const expiry = Date.now() + expiresIn * 1000;
        await AsyncStorage.multiSet([
          ['x_access_token', accessToken],
          ['x_refresh_token', refreshToken || ''],
          ['x_token_expiry', expiry.toString()],
        ]);
        if (__DEV__)
          console.log('[useTwitterAuth] Tokens saved, expiry:', new Date(expiry).toISOString());
      } catch (err) {
        if (__DEV__) console.error('[useTwitterAuth] Failed to save tokens:', err);
        throw new Error('Failed to save tokens');
      }
    },
    []
  );

  const clearTokens = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove(['x_access_token', 'x_refresh_token', 'x_token_expiry']);
      if (__DEV__) console.log('[useTwitterAuth] Tokens cleared');
    } catch (err) {
      if (__DEV__) console.error('[useTwitterAuth] Failed to clear tokens:', err);
    }
  }, []);

  const safeTimeout = useCallback((callback: () => void, ms: number): NodeJS.Timeout => {
    const id = setTimeout(() => {
      callback();
      timeoutRef.current = timeoutRef.current.filter((t) => t !== id);
    }, ms);
    timeoutRef.current.push(id);
    return id;
  }, []);

  const refreshAccessToken = useCallback(
    async (refreshToken: string): Promise<string | null> => {
      let timeoutId: NodeJS.Timeout | null = null;
      try {
        return await new Promise((resolve, reject) => {
          timeoutId = safeTimeout(() => {
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
            .then((response) => {
              if (__DEV__)
                console.log('[useTwitterAuth] Refresh token response status:', response.status);
              return response.json();
            })
            .then(async (data) => {
              if (timeoutId) clearTimeout(timeoutId);
              if (data.access_token) {
                await saveTokens(
                  data.access_token,
                  data.refresh_token || refreshToken,
                  data.expires_in || 7200
                );
                if (__DEV__) console.log('[useTwitterAuth] Refresh token successful');
                resolve(data.access_token);
              } else {
                if (__DEV__) console.error('[useTwitterAuth] Refresh token failed:', data);
                await clearTokens();
                resolve(null);
              }
            })
            .catch(async (err) => {
              if (__DEV__) console.error('[useTwitterAuth] Refresh token error:', err);
              await clearTokens();
              resolve(null);
            });
        });
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (__DEV__) console.error('[useTwitterAuth] Refresh token error:', err);
        await clearTokens();
        return null;
      }
    },
    [saveTokens, clearTokens, safeTimeout]
  );

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const [accessToken, refreshToken, expiry] = await AsyncStorage.multiGet([
        'x_access_token',
        'x_refresh_token',
        'x_token_expiry',
      ]);

      const token = accessToken[1];
      const refresh = refreshToken[1];
      const expiryTime = expiry[1] ? parseInt(expiry[1], 10) : null;

      if (__DEV__)
        console.log('[useTwitterAuth] Access token check:', { token: !!token, expiryTime });

      if (!token) return null;

      if (expiryTime && expiryTime - Date.now() < 5 * 60 * 1000 && refresh) {
        if (__DEV__) console.log('[useTwitterAuth] Token nearing expiry, attempting refresh');
        return await refreshAccessToken(refresh);
      }

      return token;
    } catch (err) {
      if (__DEV__) console.error('[useTwitterAuth] Failed to get access token:', err);
      return null;
    }
  }, [refreshAccessToken]);

  const getUserInfo = useCallback(
    async (
      token: string,
      retries = 5,
      baseRetryDelay = 2000
    ): Promise<{ id: string; username: string; profile_image_url?: string } | null> => {
      if (rateLimitResetRef.current && Date.now() < rateLimitResetRef.current) {
        const waitTime = rateLimitResetRef.current - Date.now();
        if (__DEV__)
          console.log(`[useTwitterAuth] Rate limit active, waiting ${waitTime}ms until reset`);
        setIsRateLimited(true);
        return null; // Skip retries
      }

      for (let attempt = 1; attempt <= retries; attempt++) {
        let timeoutId: NodeJS.Timeout | null = null;
        try {
          const url = `${USERS_ENDPOINT}?user.fields=id,name,username,profile_image_url`;
          const responsePromise = new Promise<Response>((resolve, reject) => {
            timeoutId = safeTimeout(() => {
              reject(new Error('User info request timed out'));
            }, REQUEST_TIMEOUT);

            fetch(url, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
              .then(resolve)
              .catch(reject);
          });

          const response = await responsePromise;
          if (timeoutId) clearTimeout(timeoutId);

          if (__DEV__) {
            console.log('[useTwitterAuth] User info response status:', response.status);
            console.log(
              '[useTwitterAuth] Rate limit remaining:',
              response.headers.get('x-rate-limit-remaining')
            );
            console.log(
              '[useTwitterAuth] Rate limit reset:',
              response.headers.get('x-rate-limit-reset')
            );
          }

          if (response.status === 429) {
            const retryAfter = response.headers.get('x-rate-limit-reset');
            const resetTime = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : Date.now() + 15 * 60 * 1000;
            rateLimitResetRef.current = resetTime;
            setIsRateLimited(true);
            if (__DEV__) console.log('[useTwitterAuth] Rate limit hit, notifying user');
            return null; // Skip retries
          }

          if (response.status === 401) {
            const refreshToken = await AsyncStorage.getItem('x_refresh_token');
            if (refreshToken) {
              if (__DEV__) console.log('[useTwitterAuth] 401 error, attempting token refresh');
              const newToken = await refreshAccessToken(refreshToken);
              if (newToken && attempt < retries) {
                token = newToken; // Update token for next attempt
                continue;
              }
            }
            throw new Error('Twitter API error: 401 - Unauthorized');
          }

          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            throw new Error('Invalid response format from Twitter API');
          }

          if (!response.ok) {
            const errorMsg = data.errors?.[0]?.message || data.detail || 'Unknown error';
            throw new Error(`Twitter API error: ${response.status} - ${errorMsg}`);
          }

          if (!data.data) {
            throw new Error('No user data in response');
          }

          rateLimitResetRef.current = null;
          setIsRateLimited(false);
          return data.data;
        } catch (err: any) {
          if (timeoutId) clearTimeout(timeoutId);
          if (__DEV__)
            console.error(
              `[useTwitterAuth] Failed to get user info (attempt ${attempt}/${retries}):`,
              err
            );
          if (attempt === retries) {
            return null; // Preserve tokens
          }
        }
      }
      return null;
    },
    [safeTimeout, refreshAccessToken]
  );

  const initialize = useCallback(async () => {
    if (loading || isInitialized.current) return;
    isInitialized.current = true;
    setLoading(true);

    try {
      if (__DEV__) console.log('[useTwitterAuth] Initializing auth state');
      const [xAccount, accessToken, tokenExpiry] = await AsyncStorage.multiGet([
        'x_account',
        'x_access_token',
        'x_token_expiry',
      ]);

      if (__DEV__)
        console.log('[useTwitterAuth] AsyncStorage values:', {
          xAccount: !!xAccount[1],
          accessToken: !!accessToken[1],
          tokenExpiry: tokenExpiry[1],
        });

      if (!xAccount[1] || !accessToken[1] || !tokenExpiry[1]) {
        if (__DEV__) console.log('[useTwitterAuth] No valid tokens, clearing');
        await clearTokens();
        setIsConnected(false);
        setAccount(null);
        return;
      }

      const expiryTime = parseInt(tokenExpiry[1], 10);
      if (__DEV__)
        console.log('[useTwitterAuth] Token expiry:', new Date(expiryTime).toISOString());

      if (expiryTime < Date.now()) {
        const refreshToken = await AsyncStorage.getItem('x_refresh_token');
        if (__DEV__) console.log('[useTwitterAuth] Token expired, refreshToken:', !!refreshToken);
        if (refreshToken) {
          const newToken = await refreshAccessToken(refreshToken);
          if (!newToken) {
            if (__DEV__) console.log('[useTwitterAuth] Refresh failed, clearing tokens');
            await clearTokens();
            setIsConnected(false);
            setAccount(null);
            return;
          }
        } else {
          if (__DEV__) console.log('[useTwitterAuth] No refresh token, clearing');
          await clearTokens();
          setIsConnected(false);
          setAccount(null);
          return;
        }
      }

      try {
        const userInfo = await getUserInfo(accessToken[1]);
        if (!userInfo) {
          if (__DEV__) console.log('[useTwitterAuth] Failed to get user info, preserving tokens');
          return; // Preserve tokens
        }

        const parsedAccount = JSON.parse(xAccount[1]);
        if (parsedAccount.userId !== userInfo.id) {
          if (__DEV__) console.log('[useTwitterAuth] User ID mismatch, clearing tokens');
          await clearTokens();
          setIsConnected(false);
          setAccount(null);
          return;
        }

        const accountData = {
          username: parsedAccount.username,
          userId: parsedAccount.userId,
          profileImageUrl: parsedAccount.profileImageUrl,
        };
        if (__DEV__) console.log('[useTwitterAuth] Setting account:', accountData);
        setAccount(accountData);
        setIsConnected(true);
      } catch (err) {
        if (__DEV__) console.error('[useTwitterAuth] Token validation failed:', err);
        return; // Preserve tokens
      }
    } catch (err) {
      if (__DEV__) console.error('[useTwitterAuth] Initialize error:', err);
      return; // Preserve tokens
    } finally {
      setLoading(false);
      if (__DEV__) console.log('[useTwitterAuth] Initialize complete:', { isConnected, account });
    }
  }, [loading, getUserInfo, clearTokens, refreshAccessToken]);

  const connectTwitter = useCallback(async () => {
    const now = Date.now();
    if (now - lastConnectAttempt.current < 5000) {
      if (__DEV__) console.log('[useTwitterAuth] Connect attempt throttled');
      return null;
    }
    lastConnectAttempt.current = now;

    if (authFlowActive || loading || isRateLimited) {
      if (__DEV__)
        console.log('[useTwitterAuth] Connect blocked:', {
          authFlowActive,
          loading,
          isRateLimited,
        });
      return null;
    }
    setLoading(true);
    setError(null);
    setAuthFlowActive(true);

    try {
      if (__DEV__) console.log('[useTwitterAuth] Starting Twitter connect');
      await clearVerifierData();
      const verifier = await generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      const state = Crypto.randomUUID().replace(/-/g, '');

      if (__DEV__)
        console.log('[useTwitterAuth] Generated:', {
          verifier: verifier.substring(0, 10) + '...',
          challenge: challenge.substring(0, 10) + '...',
          state,
        });

      await AsyncStorage.multiSet([
        ['x_code_verifier', verifier],
        ['x_code_challenge', challenge],
        ['x_auth_state', state],
      ]);

      const authUrl = new URL(AUTH_ENDPOINT);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', TWITTER_CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.append('scope', SCOPES.join(' '));
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('code_challenge', challenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');

      if (__DEV__) console.log('[useTwitterAuth] Auth URL:', authUrl.toString());

      const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), REDIRECT_URI);
      if (__DEV__) console.log('[useTwitterAuth] WebBrowser result:', result);

      if (result.type !== 'success' || !result.url) {
        throw new Error('Authentication cancelled or failed');
      }

      return result;
    } catch (err: any) {
      if (__DEV__) console.error('[useTwitterAuth] Connect error:', err);
      setError(err.message || 'Failed to start authentication');
      setAuthFlowActive(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    authFlowActive,
    loading,
    isRateLimited,
    generateCodeVerifier,
    generateCodeChallenge,
    clearVerifierData,
  ]);

  const handleAuthCallback = useCallback(
    async (url: string) => {
      if (loading) return { success: false, error: 'Authentication in progress' };
      setLoading(true);
      setError(null);

      try {
        if (__DEV__) console.log('[useTwitterAuth] Handling callback URL:', url);
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get('code');
        const authError = parsedUrl.searchParams.get('error');
        const errorDescription = parsedUrl.searchParams.get('error_description');
        const state = parsedUrl.searchParams.get('state');

        if (__DEV__)
          console.log('[useTwitterAuth] Parsed URL:', {
            code: !!code,
            state,
            authError,
            errorDescription,
          });

        if (authError) {
          throw new Error(errorDescription || 'Authentication failed');
        }

        if (!code) {
          throw new Error('No authorization code provided');
        }

        const storedState = await AsyncStorage.getItem('x_auth_state');
        if (!storedState || state !== storedState) {
          throw new Error('Invalid state parameter');
        }

        const verifier = await AsyncStorage.getItem('x_code_verifier');
        if (!verifier) {
          throw new Error('Missing code verifier');
        }

        if (__DEV__)
          console.log('[useTwitterAuth] Token exchange params:', {
            code: code.substring(0, 10) + '...',
            redirect_uri: REDIRECT_URI,
            verifier: verifier.substring(0, 10) + '...',
          });

        let timeoutId: NodeJS.Timeout | null = null;
        const responsePromise = new Promise<Response>((resolve, reject) => {
          timeoutId = safeTimeout(() => {
            reject(new Error('Token exchange request timed out'));
          }, REQUEST_TIMEOUT);

          const params = {
            code,
            grant_type: 'authorization_code',
            client_id: TWITTER_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            code_verifier: verifier,
          };

          if (__DEV__) console.log('[useTwitterAuth] Token exchange full params:', params);

          fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params).toString(),
          })
            .then(resolve)
            .catch(reject);
        });

        const response = await responsePromise;
        if (timeoutId) clearTimeout(timeoutId);

        if (__DEV__) console.log('[useTwitterAuth] Token exchange status:', response.status);

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(`Invalid token response: ${responseText}`);
        }

        if (__DEV__) console.log('[useTwitterAuth] Token exchange response:', data);

        if (!response.ok || !data.access_token) {
          if (__DEV__) console.error('[useTwitterAuth] Token exchange failed:', data);
          throw new Error(
            `Token exchange failed: ${data.error_description || JSON.stringify(data)}`
          );
        }

        await saveTokens(data.access_token, data.refresh_token || '', data.expires_in || 7200);
        const userInfo = await getUserInfo(data.access_token);
        if (!userInfo) {
          if (__DEV__) console.log('[useTwitterAuth] Failed to get user info, preserving tokens');
          setError(
            isRateLimited
              ? 'Rate limit exceeded. Please try again in 1 hour.'
              : 'Failed to retrieve user info'
          );
          return {
            success: false,
            error: isRateLimited
              ? 'Rate limit exceeded. Please try again in 1 hour.'
              : 'Failed to retrieve user info',
          };
        }

        const xAccount = {
          username: `@${userInfo.username}`,
          userId: userInfo.id,
          profileImageUrl: userInfo.profile_image_url || null,
        };

        await AsyncStorage.setItem('x_account', JSON.stringify(xAccount));
        if (__DEV__) console.log('[useTwitterAuth] Saved account:', xAccount);

        const storedAccount = await AsyncStorage.getItem('x_account');
        const storedToken = await AsyncStorage.getItem('x_access_token');
        if (__DEV__)
          console.log('[useTwitterAuth] Post-save AsyncStorage check:', {
            storedAccount: !!storedAccount,
            storedToken: !!storedToken,
          });

        setAccount(xAccount);
        setIsConnected(true);
        await clearVerifierData();

        if (__DEV__) console.log('[useTwitterAuth] Auth callback successful');
        return { success: true };
      } catch (err: any) {
        if (__DEV__) console.error('[useTwitterAuth] Auth callback error:', err);
        setError(
          err.message.includes('Rate limit')
            ? 'Rate limit exceeded. Please try again in 1 hour.'
            : err.message || 'Failed to connect X account'
        );
        setIsConnected(false);
        setAccount(null);
        return { success: false, error: err.message || 'Unknown error' };
      } finally {
        setLoading(false);
        setAuthFlowActive(false);
      }
    },
    [loading, isRateLimited, getUserInfo, saveTokens, clearVerifierData, safeTimeout]
  );

  const disconnectTwitter = useCallback(async () => {
    if (loading) return false;
    setLoading(true);
    setError(null);

    try {
      await AsyncStorage.multiRemove([
        'x_account',
        'x_access_token',
        'x_refresh_token',
        'x_token_expiry',
        'x_code_verifier',
        'x_code_challenge',
        'x_auth_state',
      ]);
      setAccount(null);
      setIsConnected(false);
      setAuthFlowActive(false);
      setIsRateLimited(false);
      if (__DEV__) console.log('[useTwitterAuth] Disconnected successfully');
      return true;
    } catch (err) {
      if (__DEV__) console.error('[useTwitterAuth] Disconnect error:', err);
      setError('Failed to disconnect');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const extractTarget = useCallback(
    (url: string, taskType: TaskType): { target: string; targetType: 'user' | 'tweet' } | null => {
      try {
        const cleanUrl = url.replace(/^(follow|retweet|comment|like|tweet)\s*:/i, '').trim();
        const parsedUrl = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
        if (taskType === 'follow') {
          const username = parsedUrl.pathname.split('/')[1];
          if (!username) throw new Error('No username in URL');
          return { target: username, targetType: 'user' };
        } else if (['like', 'retweet', 'comment'].includes(taskType)) {
          const tweetId = parsedUrl.pathname.split('/')[3];
          if (!tweetId) throw new Error('No tweet ID in URL');
          return { target: tweetId, targetType: 'tweet' };
        } else if (taskType === 'tweet') {
          const hashtag = cleanUrl.match(/#[\w]+/)?.[0] || cleanUrl;
          return { target: hashtag, targetType: 'tweet' };
        }
        return null;
      } catch (err) {
        if (__DEV__)
          console.error('[useTwitterAuth] Extract target error:', err, { url, taskType });
        return null;
      }
    },
    []
  );

  const verifyTask = useCallback(
    async (taskType: TaskType, url: string): Promise<VerificationResult> => {
      if (loading) return { completed: false, error: 'Verification in progress' };
      if (isRateLimited)
        return { completed: false, error: 'Rate limit exceeded. Please try again in 1 hour.' };
      setLoading(true);
      setError(null);

      try {
        const token = await getAccessToken();
        if (!token) {
          setError('Twitter account not connected');
          return { completed: false, error: 'Twitter account not connected' };
        }

        const xAccount = await AsyncStorage.getItem('x_account');
        if (!xAccount) {
          setError('Twitter account data missing');
          return { completed: false, error: 'Twitter account data missing' };
        }
        const { userId } = JSON.parse(xAccount);

        const targetInfo = extractTarget(url, taskType);
        if (!targetInfo) {
          setError('Invalid task URL');
          return { completed: false, error: 'Invalid task URL' };
        }
        const { target, targetType } = targetInfo;

        let endpoint = '';
        let checkFn: (data: any) => Promise<boolean> | boolean;
        switch (taskType) {
          case 'follow':
            endpoint = `https://api.x.com/2/users/${userId}/following`;
            checkFn = async (data) => {
              const userResponse = await fetch(`https://api.x.com/2/users/by/username/${target}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const userData = await userResponse.json();
              if (!userData.data?.id) return false;
              return data.data?.some((user: any) => user.id === userData.data.id) || false;
            };
            break;
          case 'like':
            endpoint = `https://api.x.com/2/users/${userId}/liked_tweets`;
            checkFn = (data) => data.data?.some((tweet: any) => tweet.id === target) || false;
            break;
          case 'retweet':
            endpoint = `https://api.x.com/2/users/${userId}/tweets?tweet.fields=referenced_tweets`;
            checkFn = (data) =>
              data.data?.some((tweet: any) =>
                tweet.referenced_tweets?.some(
                  (ref: any) => ref.type === 'retweeted' && ref.id === target
                )
              ) || false;
            break;
          case 'comment':
            endpoint = `https://api.x.com/2/users/${userId}/tweets?expansions=referenced_tweets.id`;
            checkFn = (data) =>
              data.data?.some((tweet: any) =>
                tweet.referenced_tweets?.some(
                  (ref: any) => ref.type === 'quoted' && ref.id === target
                )
              ) || false;
            break;
          case 'tweet':
            endpoint = `https://api.x.com/2/users/${userId}/tweets`;
            checkFn = (data) =>
              data.data?.some((tweet: any) =>
                tweet.text.toLowerCase().includes(target.toLowerCase())
              ) || false;
            break;
          default:
            throw new Error('Invalid task type');
        }

        let timeoutId: NodeJS.Timeout | null = null;
        const responsePromise = new Promise<Response>((resolve, reject) => {
          timeoutId = safeTimeout(() => {
            reject(new Error('Verification request timed out'));
          }, REQUEST_TIMEOUT);

          fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
            .then(resolve)
            .catch(reject);
        });

        const response = await responsePromise;
        if (timeoutId) clearTimeout(timeoutId);

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error('Invalid response format from Twitter API');
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('x-rate-limit-reset');
          const resetTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : Date.now() + 15 * 60 * 1000;
          rateLimitResetRef.current = resetTime;
          setIsRateLimited(true);
          if (__DEV__) console.log('[useTwitterAuth] Rate limit hit, notifying user');
          return { completed: false, error: 'Rate limit exceeded. Please try again in 1 hour.' };
        }

        if (response.status === 401) {
          const refresh = await AsyncStorage.getItem('x_refresh_token');
          if (refresh) {
            const newToken = await refreshAccessToken(refresh);
            if (newToken) {
              return verifyTask(taskType, url);
            }
          }
          setError('Authentication failed. Please reconnect your X account.');
          return { completed: false, error: 'Authentication failed' };
        }

        if (response.status === 403) {
          const errorMsg =
            data.errors?.[0]?.message ||
            data.detail ||
            'Access to this task is restricted. Please check your account permissions or reconnect your account.';
          setError(errorMsg);
          return { completed: false, error: errorMsg };
        }

        if (!response.ok) {
          const errorMsg = data.errors?.[0]?.message || data.detail || 'Unknown error';
          throw new Error(`API error: ${response.status} - ${errorMsg}`);
        }

        const completed = await checkFn(data);
        setIsRateLimited(false);
        return { completed, error: completed ? undefined : 'Task not completed' };
      } catch (err: any) {
        if (__DEV__) console.error('[useTwitterAuth] Verify task error:', err);
        setError(
          err.message.includes('Rate limit')
            ? 'Rate limit exceeded. Please try again in 1 hour.'
            : err.message || 'Verification failed'
        );
        return { completed: false, error: err.message || 'Verification failed' };
      } finally {
        setLoading(false);
      }
    },
    [loading, isRateLimited, getAccessToken, extractTarget, refreshAccessToken, safeTimeout]
  );

  // Reset rate limit after cooldown period
  useEffect(() => {
    if (isRateLimited && rateLimitResetRef.current) {
      const timeout = setTimeout(() => {
        setIsRateLimited(false);
        rateLimitResetRef.current = null;
        if (__DEV__) console.log('[useTwitterAuth] Rate limit cooldown expired');
      }, RATE_LIMIT_COOLDOWN);
      return () => clearTimeout(timeout);
    }
  }, [isRateLimited]);

  return useMemo(
    () => ({
      connectTwitter,
      handleAuthCallback,
      disconnectTwitter,
      verifyTask,
      initialize,
      loading,
      error,
      isConnected,
      account,
      authFlowActive,
      isRateLimited,
    }),
    [
      connectTwitter,
      handleAuthCallback,
      disconnectTwitter,
      verifyTask,
      initialize,
      loading,
      error,
      isConnected,
      account,
      authFlowActive,
      isRateLimited,
    ]
  );
};

export default useTwitterAuth;
