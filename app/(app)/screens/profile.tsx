import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  Image,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  Animated,
  Easing,
  Linking,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGetUserQuery } from '../../../store/api/api';
import { IUser } from '~/app/interfaces/interfaces';
import { useDispatch } from 'react-redux';
import { logOut } from '~/store/slices/isAuthSlice';
import { AppDispatch } from '~/store/store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';

// Shimmer effect for skeleton loading
const ShimmerEffect = ({ width, height, style }: { width: number; height: number; style: any }) => {
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [width, translateX]);

  return (
    <View
      style={[
        { width, height, backgroundColor: '#EBEBEB', overflow: 'hidden', borderRadius: 4 },
        style,
      ]}>
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
        }}>
        <LinearGradient
          colors={['#EBEBEB', '#F5F5F5', '#EBEBEB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );
};

// Profile Header Skeleton
const ProfileHeaderSkeleton = () => (
  <View style={styles.profileHeader}>
    <View style={styles.avatarContainer}>
      <ShimmerEffect width={100} height={100} style={{ borderRadius: 50 }} />
    </View>
    <ShimmerEffect width={150} height={22} style={{ marginTop: 8 }} />
    <ShimmerEffect width={180} height={16} style={{ marginTop: 6 }} />
  </View>
);

// Stats Section Skeleton
const StatsSkeleton = () => (
  <View style={styles.statsContainer}>
    {[1, 2, 3].map((_, index) => (
      <View key={index} style={styles.statItem}>
        <ShimmerEffect width={40} height={24} style={{ marginBottom: 4 }} />
        <ShimmerEffect width={70} height={16} style={{ marginTop: 1 }} />
      </View>
    ))}
  </View>
);

// Setting Item Skeleton
const SettingItemSkeleton = () => (
  <View style={styles.settingItem}>
    <View style={styles.settingItemLeft}>
      <ShimmerEffect width={24} height={24} style={{ borderRadius: 12 }} />
      <ShimmerEffect width={120} height={20} style={{ marginLeft: 12 }} />
    </View>
    <ShimmerEffect width={20} height={20} style={{ borderRadius: 10 }} />
  </View>
);

// Settings Group Skeleton
const SettingsGroupSkeleton = ({ count = 1 }) => (
  <View style={styles.settingsGroup}>
    {Array(count)
      .fill(0)
      .map((_, index) => (
        <SettingItemSkeleton key={index} />
      ))}
  </View>
);

// In-App Browser Component
export const InAppBrowser = ({
  url,
  visible,
  onClose,
}: {
  url: string;
  visible: boolean;
  onClose: any;
}) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.browserHeader}>
          <TouchableOpacity onPress={onClose} style={styles.browserCloseButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.browserTitle}>
            {isLoading
              ? 'Loading...'
              : url.includes('twitter') || url.includes('x.com')
                ? 'Twitter'
                : 'Browser'}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(url)} style={styles.browserOpenButton}>
            <Ionicons name="open-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.webviewLoading}>
            <View style={styles.webviewLoadingIndicator} />
          </View>
        )}

        <WebView
          source={{ uri: url }}
          style={styles.webview}
          startInLoadingState={true}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
        />
      </SafeAreaView>
    </Modal>
  );
};

function ProfileScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const dispatch = useDispatch<AppDispatch>();

  // Check if Twitter is connected on component mount
  useEffect(() => {
    checkTwitterConnection();
  }, []);

  // Check if Twitter account is connected
  const checkTwitterConnection = async () => {
    try {
      const twitterAccountData = await AsyncStorage.getItem('twitter_account');
      setTwitterConnected(!!twitterAccountData);
    } catch (error) {
      console.error('Failed to check Twitter connection:', error);
    }
  };

  // Open URL in the in-app browser
  const openInAppBrowser = (url: string) => {
    setBrowserUrl(url);
    setBrowserVisible(true);
  };

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: logout,
        style: 'destructive',
      },
    ]);
  }

  async function logout() {
    try {
      await GoogleSignin.signOut();
      dispatch(logOut());
      router.push({ pathname: '/screens/login' as any });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  const { data: userData, isLoading: userIsLoading, error: userError } = useGetUserQuery();
  const user: IUser | undefined = userData && userData?.data;

  const statsData = [
    {
      value: '0',
      label: 'Ads engaged',
    },
    {
      value: '0',
      label: 'Task done',
    },
    {
      value: user?.poynts || '0',
      label: 'Total Poynts',
    },
  ];

  const generalSettings = [
    {
      name: 'Social Profile',
      icon: 'people-outline',
      hasToggle: false,
      hasChevron: true,
      action: () => router.push('/screens/profile/social-profile' as any),
      badge: twitterConnected ? 'Connected' : null,
    },
  ];

  const aboutSettings = [
    {
      name: 'Follow our Socials',
      icon: 'logo-twitter',
      hasToggle: false,
      hasChevron: true,
      action: () => openInAppBrowser('https://x.com/sol_poynt'),
    },
    {
      name: 'Support',
      icon: 'chatbubble-outline',
      hasToggle: false,
      hasChevron: true,
      action: () => {
        // Open email app with support email address
        const supportEmail = 'poynt@poyntad.com';
        const subject = 'Support Request';
        const emailUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;

        Linking.canOpenURL(emailUrl)
          .then((supported) => {
            if (supported) {
              return Linking.openURL(emailUrl);
            } else {
              Alert.alert(
                'Email Not Available',
                `Please send an email to ${supportEmail} for support.`
              );
            }
          })
          .catch((err) => {
            Alert.alert('Contact Support', `Please send an email to ${supportEmail} for support.`);
          });
      },
    },
  ];

  const renderSettingItem = (item: any, index: any) => (
    <TouchableOpacity
      key={index}
      style={styles.settingItem}
      onPress={() => {
        if (item.name === 'Enable notifications') {
          setNotificationsEnabled(!notificationsEnabled);
        } else if (item.action) {
          item.action();
        }
      }}>
      <View style={styles.settingItemLeft}>
        <Ionicons name={item.icon} size={24} color="#666" />
        <Text style={styles.settingItemText}>{item.name}</Text>
      </View>

      <View style={styles.settingItemRight}>
        {item.badge && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}

        {item.hasToggle && (
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#D1D1D6', true: '#B71C1C' }}
            thumbColor={'#FFFFFF'}
          />
        )}

        {item.hasChevron && <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Profile', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {/* Profile Header */}
        {userIsLoading ? (
          <ProfileHeaderSkeleton />
        ) : (
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={40} color="#666" />
              </View>
            </View>

            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@gmail.com'}</Text>
          </View>
        )}

        {/* Stats Section */}
        {userIsLoading ? (
          <StatsSkeleton />
        ) : (
          <View style={styles.statsContainer}>
            {statsData.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* General Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>General</Text>
          {userIsLoading ? (
            <SettingsGroupSkeleton count={1} />
          ) : (
            <View style={styles.settingsGroup}>
              {generalSettings.map((item, index) => renderSettingItem(item, index))}
            </View>
          )}
        </View>

        {/* About Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>About</Text>
          {userIsLoading ? (
            <SettingsGroupSkeleton count={2} />
          ) : (
            <View style={styles.settingsGroup}>
              {aboutSettings.map((item, index) => renderSettingItem(item, index))}
            </View>
          )}
        </View>

        {/* Logout Button */}
        {userIsLoading ? (
          <ShimmerEffect
            width={360}
            height={52}
            style={{
              borderRadius: 12,
              marginTop: 8,
              marginBottom: 10,
            }}
          />
        ) : (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        )}

        {/* In-App Browser */}
        <InAppBrowser
          url={browserUrl}
          visible={browserVisible}
          onClose={() => setBrowserVisible(false)}
        />
      </SafeAreaView>
    </>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
    paddingBottom: 20,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginVertical: 15,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    marginVertical: 16,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  settingsGroup: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  badgeContainer: {
    backgroundColor: '#E5F7EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#B71C1C',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 10,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // In-App Browser Styles
  webview: {
    flex: 1,
  },
  browserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#F5F5F7',
  },
  browserTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  browserCloseButton: {
    padding: 8,
  },
  browserOpenButton: {
    padding: 8,
  },
  webviewLoading: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  webviewLoadingIndicator: {
    height: 3,
    backgroundColor: '#B71C1C',
    width: '20%',
    borderRadius: 3,
    marginHorizontal: 10,
    marginTop: 3,
    alignSelf: 'flex-start',
    opacity: 0.8,
  },
});
