import React, { useState } from 'react';
import {
  Button,
  View,
  Text,
  Platform,
  StatusBar,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import BackButton from '~/components/backButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '~/components/appButton';
import { useLocalSearchParams } from 'expo-router';
import { useSendDataMutation } from '~/store/api/api';
import { areValuesEmpty, validateRegistration } from '~/utils/util';
import Notification from '../../components/Notification';

function OTPScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [userData, setUserData] = useState({ email: email, OTP: '' });
  const [notification, setNotification] = useState({
    message: '',
    status: '',
    show: false,
  });

  const [userAuth, { isLoading }] = useSendDataMutation();
  async function verifyOTP() {
    const isDataEmpty = areValuesEmpty(userData);
    if (isDataEmpty) {
      setNotification({
        message: 'Empty Fields',
        status: 'error',
        show: true,
      });
      return;
    }
    const validationResult = validateRegistration(userData.email);
    if (validationResult) {
      const request: any = await userAuth({
        url: 'auth/validateOTP',
        data: userData,
        type: 'POST',
      });
      if (request?.data) {
        const { data, message, success } = request?.data;
        setNotification({
          message: message,
          status: 'success',
          show: true,
        });
        router.push({
          pathname: '/screens/reset',
          params: {
            email: userData.email,
            OTP: userData.OTP,
          },
        });
      } else {
        setNotification({
          message: request?.error?.data?.error
            ? request?.error?.data?.error
            : 'Check Internet Connection and try again',
          status: 'error',
          show: true,
        });
      }
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Otp', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.backBtn}>
          <BackButton link={'/screens/recover'} />
        </View>
        <Text style={styles.title}>Verify Code</Text>
        <Text style={styles.recoverText}>Enter the code sent to your email address</Text>
        <View style={styles.content}>
          <View style={styles.inputContainers}>
            <TextInput
              style={styles.inputElements}
              placeholder="OTP"
              placeholderTextColor={'gray'}
              value={userData.OTP} // Bind state
              onChangeText={(val) =>
                setUserData((prev) => {
                  return { ...prev, OTP: val };
                })
              }
            />
          </View>
        </View>

        <View style={styles.buttonContainers}>
          <AppButton
            title={isLoading ? 'Loading...' : 'Verify'}
            color={'Dark'}
            handleClick={
              isLoading
                ? function () {
                    return '';
                  }
                : verifyOTP
            }
          />
        </View>

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

export default OTPScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backBtn: {
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter-VariableFont',
    width: '100%',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 36,
    fontStyle: 'normal',
  },
  content: {
    marginTop: 30,
    width: '100%',
    gap: 15,
  },
  inputContainers: {
    height: 52,
    padding: 16,
    borderColor: '#E4E4E4',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputElements: {
    fontFamily: 'Inter-VariableFont',
    flexShrink: 1,
    fontSize: 15,
    fontStyle: 'normal',
    fontWeight: '400',
    color: '#000000',
    width: '100%',
  },
  terms: {
    fontSize: 15,
    fontStyle: 'normal',
    fontWeight: '400',
    color: '#B71C1C',
    // width: '100%',
  },
  buttonContainers: {
    width: '100%',
    marginTop: 50,
    gap: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recoverText: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 24,
    width: '100%',
    textAlign: 'center',
    color: '#7D7D7D',
  },
});
