import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking } from 'react-native';
import Notification from '~/components/Notification';
import useTwitterAuth from '~/utils/config/twitterservice';
import * as WebBrowser from 'expo-web-browser';

// Complete auth session at start
WebBrowser.maybeCompleteAuthSession();

interface AccountData {
  provider: string;
  username: string;
  connected: boolean;
  userId: string | null;
  profileImageUrl: string | null;
}

interface NotificationState {
  show: boolean;
  message: string;
  status: 'success' | 'error' | '';
}

/**
 * Social Profile Screen Component
 * Allows users to connect their social media accounts, with primary focus on Twitter/X integration
 */
const SocialProfileScreen: React.FC = () => {
  // Twitter auth hook
  const {
    connectTwitter,
    handleAuthCallback,
    disconnectTwitter,
    initialize,
    resetAuth,
    debugAuthState,
    loading,
    error,
    isConnected,
    account,
    authFlowActive,
    authStatus,
  } = useTwitterAuth();

  // Component state
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

  // Notification management

  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: '',
    status: '',
  });

  // State and refs
  const [isProcessingDeepLink, setIsProcessingDeepLink] = useState(false);
  const [processedUrls, setProcessedUrls] = useState<Set<string>>(new Set());
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // Animation values
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loadingScale = useRef(new Animated.Value(0.8)).current;

  /**
   * Start loading animation
   */
  const startLoadingAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(loadingScale, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loadingOpacity, loadingScale]);

  /**
   * End loading animation
   */
  const endLoadingAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(loadingScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loadingOpacity, loadingScale]);

  /**
   * Display notification
   */
  const showNotification = useCallback(
    (message: string, status: 'success' | 'error', duration = 3000) => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }

      setNotification({ show: true, message, status });

      notificationTimeoutRef.current = setTimeout(() => {
        setNotification({ show: false, message: '', status: '' });
        notificationTimeoutRef.current = null;
      }, duration);
    },
    []
  );

  // Clean up notification timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Initialize Twitter auth on component mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initialize().catch(() => {
        showNotification('Failed to initialize authentication', 'error');
      });
    }
  }, [initialize, showNotification]);

  // Handle auth status changes and notifications
  useEffect(() => {
    if (authStatus === 'authenticating') {
      startLoadingAnimation();
    } else {
      endLoadingAnimation();

      if (authStatus === 'success' && isConnected && account) {
        showNotification(`Connected to ${account.username} successfully!`, 'success');
      } else if (authStatus === 'error' && error) {
        // Handle rate limit errors with a more user-friendly message
        showNotification(
          error.includes('Rate limit') ? 'Too many attempts. Please try again later.' : error,
          'error',
          error.includes('Rate limit') ? 5000 : 3000
        );
      }
    }
  }, [
    authStatus,
    isConnected,
    account,
    error,
    startLoadingAnimation,
    endLoadingAnimation,
    showNotification,
  ]);

  // Update accounts state when Twitter connection status changes
  useEffect(() => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.provider === 'X'
          ? {
              ...acc,
              username: isConnected && account ? account.username : 'Not connected',
              connected: isConnected,
              userId: isConnected && account ? account.userId : null,
              profileImageUrl: isConnected && account ? account.profileImageUrl : null,
            }
          : acc
      )
    );
  }, [isConnected, account]);

  // Handle deep linking for auth callbacks
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (!url || isProcessingDeepLink || processedUrls.has(url)) {
        return;
      }

      // Always process X auth deep links with the correct format, regardless of authFlowActive state
      if (url.includes('state=') && url.includes('code=')) {
        showNotification('Detected X auth callback URL, proceeding with auth', 'success');
        // Continue processing even if authFlowActive is false, as the state may have been lost
      } else if (!authFlowActive) {
        return;
      }

      setIsProcessingDeepLink(true);
      setProcessedUrls((prev) => new Set(prev).add(url));

      try {
        const result = await handleAuthCallback(url);

        if (result.success) {
          await initialize();
        } else if (result.error) {
          showNotification(result.error, 'error');
        }
      } catch (err: any) {
        showNotification('Failed to process authentication callback', 'error');
      } finally {
        setIsProcessingDeepLink(false);
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleUrl);

    // Check for initial URL that may have launched the app
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [
    handleAuthCallback,
    isProcessingDeepLink,
    processedUrls,
    authFlowActive,
    initialize,
    showNotification,
  ]);

  /**
   * Handle X connect/disconnect button press
   */
  const handleXConnect = useCallback(async () => {
    const xAccount = accounts.find((acc) => acc.provider === 'X');

    if (xAccount?.connected) {
      // Disconnect flow
      Alert.alert('Disconnect X', 'Are you sure you want to disconnect your X account?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          onPress: async () => {
            try {
              const success = await disconnectTwitter();

              if (success) {
                showNotification('X account disconnected successfully!', 'success');
              } else {
                showNotification('Failed to disconnect X account', 'error');
              }
            } catch (err) {
              showNotification('Failed to disconnect X account', 'error');
            }
          },
          style: 'destructive',
        },
      ]);
    } else {
      // Connect flow
      try {
        const result = await connectTwitter();

        if (!result && !authFlowActive) {
          showNotification('Failed to start X authentication', 'error');
        }
      } catch (err) {
        showNotification('Failed to connect X account', 'error');
      }
    }
  }, [accounts, connectTwitter, disconnectTwitter, showNotification, authFlowActive]);

  /**
   * Reset auth state (dev-only in production)
   */
  const handleResetAuth = useCallback(async () => {
    Alert.alert('Reset X Authentication', 'This will clear all X authentication data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          try {
            await resetAuth();
            showNotification('X authentication reset successfully', 'success');
          } catch (err) {
            showNotification('Failed to reset X authentication', 'error');
          }
        },
        style: 'destructive',
      },
    ]);
  }, [resetAuth, showNotification]);

  /**
   * Debug auth state (dev-only)
   */
  const handleDebugAuth = useCallback(async () => {
    await debugAuthState();
    showNotification('Auth debug info logged to console', 'success');
  }, [debugAuthState, showNotification]);

  /**
   * Generate accounts list UI
   */
  const accountsList = useMemo(
    () =>
      accounts.map((account, index) => (
        <View
          key={account.provider}
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

          {account.provider === 'X' && authStatus === 'authenticating' ? (
            <Animated.View
              style={[
                styles.loadingContainer,
                {
                  opacity: loadingOpacity,
                  transform: [{ scale: loadingScale }],
                },
              ]}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingText}>Connecting...</Text>
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={[
                styles.connectButton,
                account.connected ? styles.disconnectButton : styles.connectButtonActive,
                account.provider !== 'X' ? styles.disabledButton : {},
              ]}
              onPress={account.provider === 'X' ? handleXConnect : undefined}
              disabled={
                account.provider !== 'X' ||
                loading ||
                isProcessingDeepLink ||
                authStatus === 'authenticating'
              }>
              {loading && account.provider === 'X' && authStatus !== 'authenticating' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.connectButtonText}>
                  {account.connected ? 'Disconnect' : 'Connect'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )),
    [accounts, handleXConnect, loading, authStatus, loadingOpacity, loadingScale]
  );

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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerText}>
            Connect your social media accounts to participate in tasks and earn Poynts.
          </Text>

          <View style={styles.accountsList}>{accountsList}</View>

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

          {/* {__DEV__ && (
            <View style={styles.debugButtons}>
              <TouchableOpacity style={styles.debugButton} onPress={handleDebugAuth}>
                <Text style={styles.debugButtonText}>Debug Auth</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={handleResetAuth}>
                <Text style={styles.resetButtonText}>Reset Auth</Text>
              </TouchableOpacity>
            </View>
          )} */}
        </ScrollView>

        {notification.show && (
          <Notification
            status={notification.status}
            message={notification.message}
            switchShowOff={() => {
              setNotification({ show: false, message: '', status: '' });
              if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
                notificationTimeoutRef.current = null;
              }
            }}
          />
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerText: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  accountsList: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    backgroundColor: '#B71C1C',
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
    marginHorizontal: 16,
    marginBottom: 24,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DA1F2',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 110,
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  debugButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 16,
  },
  debugButton: {
    padding: 10,
    backgroundColor: '#666',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  resetButton: {
    padding: 10,
    backgroundColor: '#B71C1C',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default SocialProfileScreen;
