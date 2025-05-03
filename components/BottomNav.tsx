import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getDataFromAsyncStorage } from '~/utils/localStorage';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<any>([]);
  const isHomeScreen = pathname === '/screens/home';
  const walletScreen = pathname === '/screens/wallet';
  // const [videoScreen, setVideoScreen] = useState<boolean>(true);

  // Fetch role and set navigation items after the component mounts
  useEffect(() => {
    const setupNavigation = async () => {
      // const userPath = await getUserRole();
      setNavItems([
        {
          name: 'Feed',
          path: '/screens/home',
          activeIcon: 'videocam',
          inactiveIcon: 'videocam-outline',
        },
        // {
        //   name: 'Explore',
        //   path: '/screens/earns',
        //   activeIcon: 'scan-sharp',
        //   inactiveIcon: 'scan-outline',
        // },
        {
          name: 'Leaderboard',
          path: '/screens/leaderboard',
          activeIcon: 'medal',
          inactiveIcon: 'medal-outline',
        },
        {
          name: 'Wallet',
          path: '/screens/wallet',
          activeIcon: 'wallet',
          inactiveIcon: 'wallet-outline',
        },
        {
          name: 'Profile',
          path: '/screens/profile',
          activeIcon: 'person-circle',
          inactiveIcon: 'person-circle-outline',
        },
      ]);
    };
    setupNavigation(); // Call the async function to set navigation
  }, []);

  //LOG USER OUT IF THEY ARE NOT AUTHENTICATED
  async function isAuthenticated() {
    const accessToken = await getDataFromAsyncStorage('accessToken');
    const refreshToken = await getDataFromAsyncStorage('refreshToken');
    if (!accessToken && !refreshToken) {
      router.push({ pathname: '/screens/login' });
    }
  }

  useEffect(() => {
    const checkUserAuth = async () => {
      await isAuthenticated();
    };
    checkUserAuth();
  }, []);

  // useEffect(() => {
  //   if (!isHomeScreen) {
  //     // setVideoScreen(false)
  //   }
  // }, []);

  return (
    <View style={[styles.navContainer, !isHomeScreen && styles.whiteBackground]}>
      <View style={[styles.tabBar, !isHomeScreen && styles.whiteTabBar]}>
        {navItems.map((item: any) => {
          const isActive = pathname === item.path;
          const iconName = isActive ? item.activeIcon : item.inactiveIcon;

          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => router.push(item.path)}
              style={styles.navItem}>
              <Ionicons name={iconName} size={26} color={isActive ? '#B71C1C' : '#666666'} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  whiteBackground: {
    backgroundColor: 'white',
  },
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    backgroundColor: '#000000',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: 70,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 8,
  },
  whiteTabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    width: 70,
  },
  navText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  activeText: {
    color: '#B71C1C',
    fontWeight: '800',
  },
  inactiveText: {
    color: '#666666',
  },
});
