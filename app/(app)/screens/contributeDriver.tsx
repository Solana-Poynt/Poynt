import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useGetUserQuery } from '../../../store/api/api';
import { IUser } from '~/app/interfaces/interfaces';
import { getDataFromAsyncStorage } from '~/utils/localStorage.js';
import Notification from '~/components/Notification';
import Clipboard from '@react-native-clipboard/clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';

const QRCodeGenerator = () => {
  const [userInfo, setUserInfo] = useState<{
    id: string;
    email: string;
    name: string;
    address: string;
  }>({
    id: '',
    email: '',
    name: '',
    address: '',
  });
  const [notification, setNotification] = useState({ message: '', status: '', show: false });
  const [showIdQR, setShowIdQR] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const { data: userData, isLoading: userIsLoading, error: userError } = useGetUserQuery();
  const user: IUser | null = userIsLoading ? null : (userData?.data ?? null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      setIsLoading(true);
      try {
        const id = (await getDataFromAsyncStorage('id')) || '';
        const address = (await getDataFromAsyncStorage('walletAddress')) || '';
        const email = (await getDataFromAsyncStorage('email')) || '';
        const name = (await getDataFromAsyncStorage('name')) || '';
        setUserInfo({ id, email, name, address });
      } catch (error) {
        console.error('Error fetching data from AsyncStorage', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const toggleQRCode = () => {
    setShowIdQR(!showIdQR);
  };

  const showNotification = useCallback((message: string, status: string) => {
    setNotification({ message, status, show: true });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 3000);
  }, []);

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    showNotification('Copied to clipboard', 'success');
  };

  const qrValue = showIdQR ? userInfo.id : userInfo.address;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#B71C1C" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Contribute', headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.labelTop}>Your QR Code:</Text>
        {qrValue ? (
          <View style={styles.qrContainer}>
            <QRCode value={qrValue} size={200} />
          </View>
        ) : (
          <Text style={styles.errorText}>No data available for QR code</Text>
        )}
        <View
          style={{
            width: '80%',
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 4,
            alignItems: 'center',
            gap: 12,
          }}>
          <Text style={styles.label}>{!showIdQR ? userInfo.address : userInfo.email}</Text>
          {!showIdQR && (
            <TouchableOpacity onPress={() => copyToClipboard(userInfo.address)}>
              <Ionicons name="copy-outline" size={18} color="#B71C1C" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.labelName}>{userInfo.name.toUpperCase() || 'NAME NOT AVAILABLE'}</Text>
        <TouchableOpacity style={styles.button} onPress={toggleQRCode}>
          <Text style={styles.buttonText}>Switch to {showIdQR ? 'Wallet' : 'ID'} QR</Text>
        </TouchableOpacity>

        {notification.show && (
          <Notification
            status={notification.status}
            message={notification.message}
            switchShowOff={() => setNotification((prev) => ({ ...prev, show: false }))}
          />
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 14,
    marginTop: 10,
    alignItems: 'center',
    textAlign: 'center',
    fontWeight: '500',
  },
  labelName: {
    color: 'black',
    fontSize: 25,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '900',
  },
  labelTop: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '700',
  },
  qrContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#B71C1C',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
});

export default QRCodeGenerator;
