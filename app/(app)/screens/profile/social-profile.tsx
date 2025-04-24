import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
  status: string;
}

const SocialProfileScreen: React.FC = () => {
  const {
    connectTwitter,
    handleAuthCallback,
    disconnectTwitter,
    initialize,
    loading,
    error,
    isConnected,
    account,
    authFlowActive,
    isRateLimited,
  } = useTwitterAuth();

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
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: '',
    status: '',
  });
  const [isProcessingDeepLink, setIsProcessingDeepLink] = useState(false);
  const [processedUrls, setProcessedUrls] = useState<Set<string>>(new Set());
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  const showNotification = useCallback((message: string, status: string, duration = 3000) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }

    setNotification({ show: true, message, status });
    console.log('[SocialProfileScreen] Showing notification:', { message, status });

    notificationTimeoutRef.current = setTimeout(() => {
      setNotification({ show: false, message: '', status: '' });
      notificationTimeoutRef.current = null;
    }, duration);
  }, []);

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
      console.log('[SocialProfileScreen] Initializing Twitter auth');
      initialize().catch((err) => {
        console.error('[SocialProfileScreen] Init error:', err);
      });
    }
  }, [initialize]);

  // Update accounts state when Twitter connection status changes
  useEffect(() => {
    console.log('[SocialProfileScreen] Auth state:', {
      isConnected,
      account,
      loading,
      error,
      isRateLimited,
    });

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
      console.log('[SocialProfileScreen] Received URL:', url);

      if (!url || isProcessingDeepLink || processedUrls.has(url)) {
        console.log('[SocialProfileScreen] Skipping deep link:', {
          url,
          isProcessingDeepLink,
          processed: processedUrls.has(url),
        });
        return;
      }

      setIsProcessingDeepLink(true);
      setProcessedUrls((prev) => new Set(prev).add(url));

      try {
        console.log('[SocialProfileScreen] Handling deep link:', url);
        const result = await handleAuthCallback(url);

        if (result.success) {
          console.log('[SocialProfileScreen] Deep link auth successful, re-initializing');
          await initialize();
          showNotification('X account connected successfully!', 'success');
        } else {
          showNotification(
            result.error?.includes('Rate limit')
              ? 'Rate limit exceeded. Please try again in 1 hour.'
              : result.error || 'Failed to connect X account',
            'error',
            result.error?.includes('Rate limit') ? 5000 : 3000
          );
        }
      } catch (err: any) {
        console.error('[SocialProfileScreen] Deep link error:', err);
        showNotification(
          err.message?.includes('Rate limit')
            ? 'Rate limit exceeded. Please try again in 1 hour.'
            : err.message || 'Failed to process authentication',
          'error',
          err.message?.includes('Rate limit') ? 5000 : 3000
        );
      } finally {
        setIsProcessingDeepLink(false);
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleUrl);

    // Check for initial URL that launched the app
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [handleAuthCallback, showNotification, isProcessingDeepLink, processedUrls, initialize]);

  // Show error notifications
  useEffect(() => {
    if (error) {
      showNotification(
        error.includes('Rate limit') ? 'Rate limit exceeded. Please try again in 1 hour.' : error,
        'error',
        error.includes('Rate limit') ? 5000 : 3000
      );
    }
  }, [error, showNotification]);

  // Handle X connect/disconnect
  const handleXConnect = useCallback(async () => {
    if (isRateLimited) {
      showNotification('Rate limit exceeded. Please try again in 1 hour.', 'error', 5000);
      return;
    }

    const xAccount = accounts.find((acc) => acc.provider === 'X');
    if (xAccount?.connected) {
      Alert.alert('Disconnect X', 'Are you sure you want to disconnect your X account?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          onPress: async () => {
            try {
              const success = await disconnectTwitter();
              showNotification(
                success ? 'X account disconnected successfully!' : 'Failed to disconnect X account',
                success ? 'success' : 'error'
              );
            } catch (err) {
              console.error('[SocialProfileScreen] Disconnect error:', err);
              showNotification('Failed to disconnect X account', 'error');
            }
          },
          style: 'destructive',
        },
      ]);
    } else {
      try {
        const result = await connectTwitter();
        console.log('[SocialProfileScreen] Connect result:', result);
        if (!result || result.type !== 'success') {
          // No need for notification here as the Twitter flow is just starting
        }
      } catch (err) {
        console.error('[SocialProfileScreen] Connect error:', err);
        showNotification('Authentication failed', 'error');
      }
    }
  }, [accounts, connectTwitter, disconnectTwitter, showNotification, isRateLimited]);

  // Generate accounts list
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
          <TouchableOpacity
            style={[
              styles.connectButton,
              account.connected ? styles.disconnectButton : styles.connectButtonActive,
              (account.provider !== 'X' || isRateLimited) && !account.connected
                ? styles.disabledButton
                : {},
            ]}
            onPress={account.provider === 'X' ? handleXConnect : undefined}
            disabled={
              account.provider !== 'X' ||
              loading ||
              isProcessingDeepLink ||
              (isRateLimited && !account.connected)
            }>
            {(loading || isProcessingDeepLink) && account.provider === 'X' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.connectButtonText}>
                {account.connected
                  ? 'Disconnect'
                  : isRateLimited && account.provider === 'X'
                    ? 'Try Again Later'
                    : 'Connect'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )),
    [accounts, handleXConnect, loading, isProcessingDeepLink, isRateLimited]
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
        <Text style={styles.headerText}>
          Connect your social media accounts to participate in tasks and earn Poynts.
        </Text>
        <View style={styles.accountsList}>{accountsList}</View>
        {isRateLimited && (
          <Text style={styles.rateLimitText}>Rate limit exceeded. Please try again in 1 hour.</Text>
        )}
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
    padding: 16,
  },
  headerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
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
  rateLimitText: {
    fontSize: 14,
    color: '#B71C1C',
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default SocialProfileScreen;
