import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NotificationProps = {
  message: string;
  // status: 'error' | 'success' | 'info';
  status: string;
  switchShowOff: () => void;
};

const Notification: React.FC<NotificationProps> = ({ message, status, switchShowOff }) => {
  const color = status === 'error' ? '#f20000' : status === 'success' ? '#4BB543' : 'dodgerblue'; // Default color for "info"

  // REMOVE NOTIFICATION AFTER 10 SECONDS
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      switchShowOff();
    }, 4500);

    return () => clearTimeout(timeoutId); // Cleanup on component unmount
  }, [switchShowOff]);

  const getIconName = () => {
    if (status === 'error') {
      return 'close-circle';
    } else if (status === 'success') {
      return 'checkmark-circle';
    } else {
      return 'information-circle';
    }
  };

  return (
    <View style={[styles.notifyBox, { backgroundColor: color }]}>
      <Ionicons name={getIconName()} size={24} color="white" />
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
};

export default Notification;

const styles = StyleSheet.create({
  notifyBox: {
    flexDirection: 'row', // For horizontal layout
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    width: '100%',
    borderRadius: 5,
    marginVertical: 10,
    position: 'absolute',
    bottom: 92,
    zIndex: 9999,
  },
  messageText: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#ffffff',
  },
});
