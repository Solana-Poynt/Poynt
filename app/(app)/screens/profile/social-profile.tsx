import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { Linking } from 'react-native';
import { Buffer } from 'buffer';

// Define types for account data
interface AccountData {
  provider: string;
  username: string;
  connected: boolean;
  userId: string | null;
  profileImageUrl: string | null;
}

// Define type for Twitter user info
interface TwitterUserInfo {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

// Register for redirect
WebBrowser.maybeCompleteAuthSession();

// Twitter OAuth 2.0 constants
const TWITTER_CLIENT_ID = 'bk42enJZLWg2dUxNRTB1N0FpNms6MTpjaQ';

// Twitter API endpoints
const discovery = {
  authorizationEndpoint: 'https://x.com/i/oauth2/authorize',
  tokenEndpoint: 'https://api.x.com/2/oauth2/token',
};

// Get the exact redirect URI using Expo's helper
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'com.alphar33.poynt',
  path: 'expo-auth-session',
});

const USERS_ENDPOINT = 'https://api.x.com/2/users/me';
const SCOPES = ['users.read', 'tweet.read', 'follows.read', 'offline.access'];

// Function to URL encode a string according to RFC 4648
function URLEncode(str: string): string {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Function to generate code verifier
async function generateCodeVerifier(): Promise<string> {
  // Generate a random 32-byte buffer
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const base64String = Buffer.from(randomBytes).toString('base64');
  // Convert to URL-safe format
  return URLEncode(base64String);
}

// Function to create a code challenge from a verifier
async function generateCodeChallenge(verifier: string): Promise<string> {
  // Create SHA-256 hash
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);

  // Convert hash to base64
  const base64 = Buffer.from(hash, 'hex').toString('base64');

  // Convert to URL-safe format
  return URLEncode(base64);
}

export default function SocialProfileScreen() {
  const router = useRouter();
  const hasInitialized = useRef<boolean>(false);
  const [accounts, setAccounts] = useState<AccountData[]>([
    {
      provider: 'X',
      username: 'Not connected',
      connected: false,
      userId: null,
      profileImageUrl: null,
    },
    {
      provider: 'Instagram',
      username: 'Not connected',
      connected: false,
      userId: null,
      profileImageUrl: null,
    },
  ]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [authFlowActive, setAuthFlowActive] = useState<boolean>(false);

  // Initial setup - runs only once
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;

      // Clear any stale authentication data on startup
      clearVerifierData().then(() => {
        loadConnectedAccounts();
        loadStoredTokens();
      });
    }
  }, []);

  // Handle auth response - only runs when deep link is processed
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      processDeepLink(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        processDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, []);

  // Clear old verifier data
  const clearVerifierData = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('x_code_verifier');
      await AsyncStorage.removeItem('x_code_challenge');
      await AsyncStorage.removeItem('x_auth_state');
    } catch (error) {
      // Handle error silently
    }
  };

  // Process deep links
  const processDeepLink = (url: string): void => {
    if (!url) return;

    try {
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get('code');
      const state = parsedUrl.searchParams.get('state');

      if (code) {
        AsyncStorage.getItem('x_code_verifier').then((verifier) => {
          if (verifier) {
            // Make sure we're on the correct screen before processing the code
            if (!url.includes('/screens/profile/social-profile')) {
              router.replace('/screens/profile/social-profile');
              // Small delay to ensure navigation completes
              setTimeout(() => {
                handleAuthCode(code, verifier);
              }, 300);
            } else {
              handleAuthCode(code, verifier);
            }
          } else {
            setAuthError('Authentication failed: Missing verifier');
            setShowManualEntry(true);
            setIsConnecting(false);
            setAuthFlowActive(false);
            // Ensure we return to the correct screen
            router.replace('/screens/profile/social-profile');
          }
        });
      }
    } catch (error) {
      // Handle error silently
      router.replace('/screens/profile/social-profile');
    }
  };

  // Handle manual code entry
  const handleManualCodeSubmit = (): void => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a valid code');
      return;
    }

    AsyncStorage.getItem('x_code_verifier').then((verifier) => {
      if (verifier) {
        handleAuthCode(manualCode.trim(), verifier);
      } else {
        Alert.alert('Error', 'Authentication session expired. Please try again.');
        setShowManualEntry(false);
        setIsConnecting(false);
        setAuthFlowActive(false);
      }
    });
  };

  // Enhanced exchange auth code for tokens
  const handleAuthCode = async (code: string, codeVerifier: string): Promise<void> => {
    try {
      setIsConnecting(true);

      if (!code || !codeVerifier) {
        throw new Error('Missing authorization code or verifier');
      }

      // Prepare parameters
      const params = {
        code,
        grant_type: 'authorization_code',
        client_id: TWITTER_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      };

      // Perform token exchange
      const tokenResponse = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(params).toString(),
      });

      // Get response text
      const responseText = await tokenResponse.text();

      // Parse the response
      let tokenData: any;
      try {
        tokenData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid token response: ${responseText}`);
      }

      if (!tokenData.access_token) {
        throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
      }

      // Save tokens if successful
      await saveTokens(
        tokenData.access_token,
        tokenData.refresh_token || '',
        tokenData.expires_in || 7200
      );

      // Get user info
      const userInfo = await getUserInfo(tokenData.access_token);

      const xAccount = {
        username: `@${userInfo.username}`,
        userId: userInfo.id,
        profileImageUrl: userInfo.profile_image_url || null,
      };

      await AsyncStorage.setItem('x_account', JSON.stringify(xAccount));
      updateAccountStatus('X', true, xAccount.username, xAccount.userId, xAccount.profileImageUrl);

      Alert.alert('Success', 'X account connected successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Redirect back to social profile screen using router
            router.replace('/screens/profile/social-profile');
          },
        },
      ]);

      setShowManualEntry(false);
      setManualCode('');

      // Reset auth flow state
      setAuthFlowActive(false);

      // Clear PKCE data after successful authentication
      await clearVerifierData();
    } catch (error: any) {
      setAuthError(error.message || 'Failed to authenticate');
      Alert.alert('Authentication Failed', error.message || 'Failed to connect X account', [
        {
          text: 'OK',
          onPress: () => {
            // Redirect back to social profile screen even on failure
            router.replace('/screens/profile/social-profile');
          },
        },
      ]);
    } finally {
      setIsConnecting(false);
    }
  };

  // Load stored tokens
  const loadStoredTokens = async (): Promise<void> => {
    try {
      const storedAccessToken = await AsyncStorage.getItem('x_access_token');
      const storedRefreshToken = await AsyncStorage.getItem('x_refresh_token');
      const storedExpiry = await AsyncStorage.getItem('x_token_expiry');

      if (storedAccessToken) setAccessToken(storedAccessToken);
      if (storedRefreshToken) setRefreshToken(storedRefreshToken);

      if (storedExpiry) {
        const expiry = parseInt(storedExpiry);
        setTokenExpiry(expiry);

        if (expiry - Date.now() < 5 * 60 * 1000 && storedRefreshToken) {
          refreshAccessToken(storedRefreshToken);
        }
      }
    } catch (error) {
      // Handle error silently
    }
  };

  // Save tokens to storage
  const saveTokens = async (
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> => {
    try {
      const expiry = Date.now() + expiresIn * 1000;
      await AsyncStorage.setItem('x_access_token', accessToken);

      if (refreshToken) {
        await AsyncStorage.setItem('x_refresh_token', refreshToken);
      }

      await AsyncStorage.setItem('x_token_expiry', expiry.toString());

      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setTokenExpiry(expiry);
    } catch (error) {
      // Handle error silently
    }
  };

  // Refresh access token
  const refreshAccessToken = async (storedRefreshToken: string): Promise<string | null> => {
    try {
      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: storedRefreshToken,
          grant_type: 'refresh_token',
          client_id: TWITTER_CLIENT_ID,
        }).toString(),
      });

      const data = await response.json();

      if (data.access_token) {
        saveTokens(
          data.access_token,
          data.refresh_token || storedRefreshToken,
          data.expires_in || 7200
        );
        return data.access_token;
      } else {
        clearTokens();
        return null;
      }
    } catch (error) {
      clearTokens();
      return null;
    }
  };

  // Clear tokens
  const clearTokens = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('x_access_token');
      await AsyncStorage.removeItem('x_refresh_token');
      await AsyncStorage.removeItem('x_token_expiry');
      await clearVerifierData();

      setAccessToken(null);
      setRefreshToken(null);
      setTokenExpiry(null);
    } catch (error) {
      // Handle error silently
    }
  };

  // Load connected accounts
  const loadConnectedAccounts = async (): Promise<void> => {
    try {
      const xAccountData = await AsyncStorage.getItem('x_account');

      if (xAccountData) {
        const xAccount = JSON.parse(xAccountData);
        updateAccountStatus(
          'X',
          true,
          xAccount.username,
          xAccount.userId,
          xAccount.profileImageUrl
        );
      }
    } catch (error) {
      // Handle error silently
    }
  };

  // Update account status
  const updateAccountStatus = (
    provider: string,
    connected: boolean,
    username: string = 'Not connected',
    userId: string | null = null,
    profileImageUrl: string | null = null
  ): void => {
    setAccounts((prevAccounts) =>
      prevAccounts.map((account) =>
        account.provider === provider
          ? { ...account, connected, username, userId, profileImageUrl }
          : account
      )
    );
  };

  // Handle X connect button
  const handleXConnect = async (): Promise<void> => {
    const xAccount = accounts.find((account) => account.provider === 'X');

    if (xAccount?.connected) {
      Alert.alert('Disconnect X', 'Are you sure you want to disconnect your X account?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', onPress: () => disconnectX(), style: 'destructive' },
      ]);
    } else {
      setAuthError('');
      connectX();
    }
  };

  // Custom implementation of connect X using our own PKCE code
  const connectX = async (): Promise<void> => {
    try {
      if (authFlowActive) {
        return;
      }

      setIsConnecting(true);
      setShowManualEntry(false);
      setAuthError('');
      setAuthFlowActive(true);

      // Reset everything to start fresh
      await clearVerifierData();

      // Generate a verifier and challenge using the proper method
      const verifier = await generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      // Store in state and AsyncStorage
      await AsyncStorage.setItem('x_code_verifier', verifier);
      await AsyncStorage.setItem('x_code_challenge', challenge);

      // Generate a random state
      const state = Crypto.randomUUID().replace(/-/g, '');

      // Create the authorization URL manually
      const authUrl =
        `${discovery.authorizationEndpoint}?` +
        `response_type=code` +
        `&client_id=${TWITTER_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
        `&state=${state}` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256`;

      if (Platform.OS === 'android') {
        Alert.alert('Twitter Authentication', 'You will be redirected to Twitter to sign in', [
          {
            text: 'Continue',
            onPress: async () => {
              try {
                // Open browser directly
                const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

                if (result.type !== 'success') {
                  setShowManualEntry(true);
                }
              } catch (err) {
                setShowManualEntry(true);
                setIsConnecting(false);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setIsConnecting(false);
              setAuthFlowActive(false);
            },
          },
        ]);
      } else {
        // iOS flow
        try {
          // Open browser
          const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

          if (result.type !== 'success') {
            setShowManualEntry(true);
          }
        } catch (err) {
          setShowManualEntry(true);
          setIsConnecting(false);
          setAuthFlowActive(false);
        }
      }
    } catch (error: any) {
      setAuthError(error.message || 'Failed to connect X account');
      setShowManualEntry(true);
      setIsConnecting(false);
      setAuthFlowActive(false);
    }
  };

  // Get user info
  const getUserInfo = async (token: string): Promise<TwitterUserInfo> => {
    try {
      const url = `${USERS_ENDPOINT}?user.fields=id,name,username,profile_image_url`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid response format from Twitter API');
      }

      if (data.errors) {
        throw new Error(`Twitter API error: ${data.errors[0]?.message || 'Unknown error'}`);
      }

      if (!data.data) {
        throw new Error('Failed to get user information');
      }

      return data.data as TwitterUserInfo;
    } catch (error) {
      throw new Error('Failed to retrieve user information');
    }
  };

  // Disconnect X
  const disconnectX = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      await AsyncStorage.removeItem('x_account');
      await clearTokens();
      updateAccountStatus('X', false);
      Alert.alert('Success', 'X account disconnected successfully!');
    } catch (error) {
      Alert.alert('Disconnection Failed', 'Failed to disconnect X account. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // UI rendering
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Social Profiles',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#333',
          headerShadowVisible: false,
        }}
      />

      <SafeAreaView style={styles.container}>
        <Text style={styles.headerText}>
          Connect your social media accounts to participate in tasks and earn Poynts.
        </Text>

        {authError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        )}

        {showManualEntry && (
          <View style={styles.manualEntryContainer}>
            <Text style={styles.manualEntryTitle}>
              Enter the code from Twitter to complete authentication:
            </Text>
            <TextInput
              style={styles.manualEntryInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Paste authentication code here"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[
                styles.manualEntryButton,
                !manualCode.trim() || isConnecting ? styles.buttonDisabled : null,
              ]}
              onPress={handleManualCodeSubmit}
              disabled={!manualCode.trim() || isConnecting}>
              <Text style={styles.manualEntryButtonText}>
                {isConnecting ? 'Verifying...' : 'Submit Code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.accountsList}>
          {accounts.map((account, index) => (
            <View
              key={index}
              style={[styles.accountItem, index < accounts.length - 1 && styles.accountItemBorder]}>
              <View style={styles.accountInfo}>
                <View
                  style={[
                    styles.providerIcon,
                    account.provider === 'X' ? styles.xIcon : styles.instagramIcon,
                  ]}>
                  <Ionicons
                    name={account.provider === 'X' ? 'logo-twitter' : 'logo-instagram'}
                    size={24}
                    color="white"
                  />
                </View>

                <View style={styles.accountTextContainer}>
                  <Text style={styles.providerName}>{account.provider}</Text>
                  <Text
                    style={[
                      styles.accountUsername,
                      account.connected ? styles.connectedText : styles.notConnectedText,
                    ]}>
                    {account.username}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.connectButton,
                  account.connected ? styles.disconnectButton : styles.connectButtonActive,
                  account.provider !== 'X' && styles.disabledButton,
                ]}
                onPress={account.provider === 'X' ? handleXConnect : undefined}
                disabled={account.provider !== 'X' || isConnecting}>
                {isConnecting && account.provider === 'X' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.connectButtonText}>
                    {account.connected ? 'Disconnect' : 'Connect'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#666"
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            We only use your social accounts to verify task completion. We do not post on your
            behalf without your explicit permission.
          </Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  manualEntryContainer: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  manualEntryTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  manualEntryInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  manualEntryButton: {
    backgroundColor: '#A71919',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  manualEntryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  accountsList: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accountItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  xIcon: {
    backgroundColor: '#000000',
  },
  instagramIcon: {
    backgroundColor: '#C13584',
  },
  accountTextContainer: {
    justifyContent: 'center',
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  accountUsername: {
    fontSize: 14,
  },
  connectedText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  notConnectedText: {
    color: '#999',
  },
  connectButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  connectButtonActive: {
    backgroundColor: '#A71919',
  },
  disconnectButton: {
    backgroundColor: '#666',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
