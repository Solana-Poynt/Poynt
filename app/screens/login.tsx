import React, { useEffect, useState } from 'react';
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
import { useSendDataMutation } from '../../store/api/api';
import Notification from '../../components/Notification';
import { areValuesEmpty, validateRegistration } from '../../utils/util.js';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { setIsAuth } from '../../store/slices/isAuthSlice';
import { getDataFromAsyncStorage, saveDataToAsyncStorage } from '~/utils/localStorage.js';

function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [notification, setNotification] = useState({
    message: '',
    status: '',
    show: false,
  });
  const [data, setData] = useState({
    email: '',
    password: '',
  });

  //MAKE API CALL
  const [signIn, { isLoading, reset }] = useSendDataMutation();
  async function login() {
    const isEmpty = areValuesEmpty(data);
    if (isEmpty) {
      setNotification({
        message: 'Empty Fields',
        status: 'error',
        show: true,
      });
      return;
    }
    const validationResult = validateRegistration(data.email);
    if (validationResult !== true) {
      setNotification({
        message: validationResult,
        status: 'error',
        show: true,
      });
      return;
    }
    const request: any = await signIn({
      url: 'auth/login',
      data: data,
      type: 'POST',
    });
    if (request?.data) {
      const { message, accessToken, refreshToken, user } = request?.data;
      setNotification({
        message: message,
        status: 'success',
        show: true,
      });
      //dispatch setisauth here
      dispatch(
        setIsAuth({
          accessToken: accessToken,
          refreshToken: refreshToken,
          user: user,
        })
      );
      await saveDataToAsyncStorage('accessToken', accessToken);
      await saveDataToAsyncStorage('refreshToken', refreshToken);
      await saveDataToAsyncStorage('id', user._id);
      await saveDataToAsyncStorage('email', user.email);
      await saveDataToAsyncStorage('name', user.name);
      router.push({ pathname: '/screens/home' });
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

  //CHECK IF USER IS AUTHENTICATED
  // const isAuthenticated = useSelector((state: any) => state.isAuth.isAuth);
  const isAuthenticated = useSelector((state: RootState) => state.isAuth.isAuth);
  async function getData() {
    const email = await getDataFromAsyncStorage('email');
  }
  getData();

  useEffect(() => {
    if (isAuthenticated) {
      router.push({ pathname: '/screens/home' });
    }
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Login', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.backBtn}>
          <BackButton link={'/screens/signup'} />
        </View>
        <Text style={styles.title}>Login your Account</Text>
        <View style={styles.content}>
          <View style={styles.inputContainers}>
            <Image source={require('../../assets/mail.png')} resizeMode="contain" />
            <TextInput
              style={styles.inputElements}
              placeholder="Email address"
              placeholderTextColor={'gray'}
              value={data.email} // Bind state
              onChangeText={(val) =>
                setData((prev) => {
                  return { ...prev, email: val };
                })
              }
            />
          </View>
          <View style={styles.inputContainers}>
            <Image source={require('../../assets/key.png')} resizeMode="contain" />
            <TextInput
              style={styles.inputElements}
              placeholder="Password"
              placeholderTextColor={'gray'}
              secureTextEntry
              value={data.password} // Bind state
              onChangeText={(val) =>
                setData((prev) => {
                  return { ...prev, password: val };
                })
              }
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/screens/recover' })}>
              <Text style={styles.terms}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonContainers}>
          <AppButton
            title={isLoading ? 'Loading...' : 'Login'}
            color={'Dark'}
            handleClick={
              isLoading
                ? function () {
                    return '';
                  }
                : login
            }
          />
          <AppButton title={'Login with Google'} color={'Light'} image={'google'} />
        </View>

        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 30,
          }}>
          <Text style={[styles.terms, { color: '#A2A2A2' }]}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/screens/signup' })}>
            <Text style={styles.terms}>Create account</Text>
          </TouchableOpacity>
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

export default LoginScreen;

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
    fontFamily: 'Inter-VariableFont',
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
});
