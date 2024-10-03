import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
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
      console.log(role); // For debugging

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
          name: 'Home',
          path: '/screens/home',
          icon: 'home',
        },
        {
          name: 'Navigate',
          path: '/screens/navigate',
          icon: 'location-sharp',
        },
        {
          name: 'Contribute',
          path: userPath, // Dynamically set the path based on user role
          icon: 'extension-puzzle-sharp',
        },
        {
          name: 'Profile',
          path: '/screens/profile',
          icon: 'person',
        },
      ]);
    };

    setupNavigation(); // Call the async function to set navigation
  }, []);

  return (
    <View style={styles.navContainer}>
      <View style={styles.container}>
        {navItems.map((item: any) => (
          <TouchableOpacity
            key={item.name}
            onPress={() => router.push(item.path)}
            style={styles.navItem}>
            <Ionicons
              style={[pathname === item.path && styles.activeNavIcon]}
              name={item.icon}
              size={28}
              color="grey"
            />
            <Text style={[styles.navText, pathname === item.path && styles.activeNavText]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// border-radius: 100px;
// background: rgba(255, 255, 255, 0.70);
// box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.10);
// backdrop-filter: blur(20px);

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  container: {
    flexDirection: 'row',
    gap: 34,
    width: 348,
    borderRadius: 36,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.10)',
    shadowColor: 'rgba(0, 0, 0, 0.10)',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 25,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  navText: {
    fontSize: 12,
    color: 'grey',
  },
  activeNavText: {
    color: 'black',
    fontWeight: 'bold',
  },
  activeNavIcon: {
    color: '#B71C1C',
    fontWeight: 'bold',
  },
});
