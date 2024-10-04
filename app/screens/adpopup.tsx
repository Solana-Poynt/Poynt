import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Platform,
  StatusBar,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSendDataMutation } from '../../store/api/api';
import Notification from '../../components/Notification';

function AdpopupScreen() {
  const router = useRouter();
  const { driverId } = useLocalSearchParams();
  const [count, setCount] = useState(5); // Start countdown from 5
  const [isCountdownComplete, setIsCountdownComplete] = useState(false);
  const [notification, setNotification] = useState({
    message: '',
    status: '',
    show: false,
  });

  //MAKE API CALL TO FUND DRIVER WHOSE QRCODE WAS SCANNED
  const [fund, { isLoading }] = useSendDataMutation();
  async function handleSendPoyntsToDriver() {
    if (isCountdownComplete) {
      const request: any = await fund({
        url: 'user/fundPoynt/',
        data: {
          // driverId: driverId,
          driverId: '66f17add410e5fa5d5a05522', //I am hard coding the id so we can use to test but normally you should pass the driverId here just like the line above
          poyntValue: '30',
        },
        type: 'PATCH',
      });
      if (request?.data) {
        const { message, user } = request?.data;
        setNotification({
          message: message,
          status: 'success',
          show: true,
        });
        // router.push({ pathname: '/screens/home' });
      } else {
        setNotification({
          message: request?.error?.data?.error
            ? request?.error?.data?.error
            : 'Check Internet Conn and try again',
          status: 'error',
          show: true,
        });
      }
    }
  }

  useEffect(() => {
    if (count > 0) {
      const countdownInterval = setInterval(() => {
        setCount((prevCount) => prevCount - 1);
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else {
      setIsCountdownComplete(true);
    }
  }, [count]);

  return (
    <>
      <Stack.Screen options={{ title: 'Adpopup', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.circle} onPress={handleSendPoyntsToDriver}>
          {isCountdownComplete ? (
            <Ionicons name="close" size={20} color="black" /> // X Icon from Ionicons
          ) : (
            <Text style={styles.text}>{count}</Text> // Show countdown numbers
          )}
        </TouchableOpacity>
        <Image source={require('../../assets/brett-solana.gif')} style={styles.gif} />

        {/* DISPLAY NOTIFICATION TO USER IF IT EXISTS */}
        {notification.show ? (
          <Notification
            status={notification.status}
            message={notification.message}
            switchShowOff={() => {
              setNotification((prev) => {
                return { ...prev, show: false };
              });
            }}
          />
        ) : (
          ''
        )}
      </SafeAreaView>
    </>
  );
}

export default AdpopupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    zIndex: 99999,
  },
  gif: {
    width: '100%',
    height: 400,
  },
  circle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15, // Makes the view a circle
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'black', // Optional: adds a border for better visibility
  },
  text: {
    fontSize: 14,
    color: 'black',
    fontWeight: 'bold',
  },
});
