import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
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
      path: '/screens/settings',
      icon: 'extension-puzzle-sharp',
    },
    {
      name: 'Profile',
      path: '/screens/profile',
      icon: 'person',
    },
    // Add this if you have a settings screen
  ];

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
    bottom: 32,
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
