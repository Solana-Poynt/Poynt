import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getDataFromAsyncStorage } from '~/utils/localStorage.js';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [navItems, setNavItems] = useState<any>([]);

  // Function to fetch the role from AsyncStorage
  const getUserRole = async () => {
    try {
      const role = await getDataFromAsyncStorage('role');

      return role === 'driver' ? '/screens/contributeDriver' : '/screens/contributeUser';
    } catch (error) {
      console.error('Error fetching role from AsyncStorage:', error);
      return '/screens/contributeUser'; // Default route if an error occurs
    }
  };

  // Fetch role and set navigation items after the component mounts
  useEffect(() => {
    const setupNavigation = async () => {
      const userPath = await getUserRole();
      setNavItems([
        {
          name: 'Feed',
          path: '/screens/home',
          icon: 'videocam',
        },
        {
          name: 'Explore',
          path: '/screens/navigate',
          icon: 'scan-sharp', 
        },
        {
          name: 'Notifications',
          path: userPath,
          icon: 'notifications',
        },
        {
          name: 'Profile',
          path: '/screens/profile',
          icon: 'person-circle',
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

  return (
    <View style={styles.navContainer}>
      <View style={styles.tabBar}>
        {navItems.map((item: any) => (
          <TouchableOpacity
            key={item.name}
            onPress={() => router.push(item.path)}
            style={styles.navItem}>
            <Ionicons
              name={item.icon}
              size={28}
              color={pathname === item.path ? '#B71C1C' : '#999999'}
            />
          </TouchableOpacity>
        ))}
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
    height: 60,
    
  },
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    backgroundColor: '#000000',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: 60,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 0,
   
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    width: 60,
  },
});
