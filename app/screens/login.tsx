import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { setIsAuth } from '../../store/slices/isAuthSlice';
import { useSendDataMutation } from '../../store/api/api';
import { useOkto, type OktoContextType } from 'okto-sdk-react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AppButton from '~/components/appButton';
import Notification from '../../components/Notification';
import { areValuesEmpty, validateRegistration } from '../../utils/util.js';
import { getDataFromAsyncStorage, saveDataToAsyncStorage } from '~/utils/localStorage.js';
import { Ionicons } from '@expo/vector-icons';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

interface NotificationState {
  message: string;
  status: string;
  show: boolean;
}

function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [signIn, { isLoading }] = useSendDataMutation();
  const { authenticate, createWallet } = useOkto() as OktoContextType;

  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    status: '',
    show: false,
  });
  const [data, setData] = useState({ email: '', password: '' });
  const [isRole, setRole] = useState('user');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const roles = ['driver', 'user'];

  useEffect(() => {
    checkUserAuth();
  }, []);

  async function checkUserAuth() {
    const accessToken = await getDataFromAsyncStorage('accessToken');
    const refreshToken = await getDataFromAsyncStorage('refreshToken');

    if (accessToken && refreshToken) {
      router.push({ pathname: '/screens/home' });
    }
  }

  async function handleAuthenticate(result: any, error: any) {
    if (result) {
      router.push({ pathname: '/screens/home' });
    }
    if (error) {
      console.error('Okto authentication error:', error);
      showNotification('Okto authentication failed', 'error');
    }
  }

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const handleSelection = (value: string) => {
    setRole(value);
    setIsDropdownOpen(false);
  };

  async function handleGoogleSignIn() {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo: any = await GoogleSignin.signIn();

      if (userInfo.data.idToken) {
        const { name, email } = userInfo.data.user;
        const response: any = await signIn({
          url: 'auth/google',
          data: { name, idToken: userInfo.data.idToken, email, role: isRole },
          type: 'POST',
        });

        if (response.data) {
          handleSuccessfulLogin(response.data);
          authenticate(userInfo.data.idToken, handleAuthenticate);
          await createWallet();
        } else {
          throw new Error('Failed to authenticate with the server');
        }
      }
    } catch (error: any) {
      console.error('Detailed Google Sign-In error:', JSON.stringify(error, null, 2));
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        showNotification('Sign-In was cancelled', 'info');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showNotification('Sign-In is already in progress', 'warning');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showNotification('Play services not available or outdated', 'error');
      } else {
        showNotification(`Google Sign-In failed: ${error.message}`, 'error');
      }
    }
  }

  async function handleEmailPasswordLogin() {
    if (areValuesEmpty(data)) {
      showNotification('Empty Fields', 'error');
      return;
    }

    const validationResult = validateRegistration(data.email);
    if (validationResult !== true) {
      showNotification(validationResult, 'error');
      return;
    }

    try {
      const response: any = await signIn({
        url: 'auth/login',
        data,
        type: 'POST',
      });

      if (response?.data) {
        handleSuccessfulLogin(response.data);
      } else {
        throw new Error(response?.error?.data?.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification('An error occurred during login', 'error');
    }
  }

  async function handleSuccessfulLogin(loginData: any) {
    const { message, accessToken, refreshToken, data } = loginData;
    showNotification(message || 'Login successful', 'success');

    const user = data;
    dispatch(setIsAuth({ accessToken, refreshToken, user }));

    if (accessToken && refreshToken) {
      try {
        const storagePromises = [
          saveDataToAsyncStorage('accessToken', accessToken),
          saveDataToAsyncStorage('refreshToken', refreshToken),
        ];

        // Add user data to storage if available
        if (user) {
          if (user._id) storagePromises.push(saveDataToAsyncStorage('id', user._id));
          if (user.email) storagePromises.push(saveDataToAsyncStorage('email', user.email));
          if (user.name) storagePromises.push(saveDataToAsyncStorage('name', user.name));
          if (user.role) storagePromises.push(saveDataToAsyncStorage('role', user.role));
        }

        await Promise.all(storagePromises);

        // Navigate to home screen
        router.push({ pathname: '/screens/home' });
      } catch (error) {
        console.error('Error saving data to AsyncStorage:', error);
        showNotification('Failed to save user data', 'error');
      }
    } else {
      console.error('Missing required authentication tokens');
      showNotification('Login failed: Missing authentication tokens', 'error');
    }
  }

  function showNotification(message: string, status: string) {
    setNotification({ message, status, show: true });
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Login', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Login to your Account</Text>
        <View style={styles.content}>
          <View style={styles.inputContainers}>
            <Image source={require('../../assets/mail.png')} resizeMode="contain" />
            <TextInput
              style={styles.inputElements}
              placeholder="Email address"
              placeholderTextColor="gray"
              value={data.email}
              onChangeText={(val) => setData((prev) => ({ ...prev, email: val }))}
            />
          </View>
          <View style={styles.inputContainers}>
            <Image source={require('../../assets/key.png')} resizeMode="contain" />
            <TextInput
              style={styles.inputElements}
              placeholder="Password"
              placeholderTextColor="gray"
              secureTextEntry
              value={data.password}
              onChangeText={(val) => setData((prev) => ({ ...prev, password: val }))}
            />
          </View>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.dropdown} onPress={toggleDropdown}>
              <Image source={require('../../assets/user.png')} resizeMode="contain" />
              <Text style={styles.selectedText}>{isRole || 'Select Role'}</Text>
              <Ionicons
                name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="grey"
              />
            </TouchableOpacity>
            {isDropdownOpen && (
              <View style={styles.dropdownList}>
                {roles.map((role, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.dropdownItem}
                    onPress={() => handleSelection(role)}>
                    <Text style={styles.dropdownItemText}>{role}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: '/screens/recover' })}>
            <Text>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainers}>
          <AppButton
            title={isLoading ? 'Loading...' : 'Login'}
            color="Dark"
            handleClick={handleEmailPasswordLogin}
          />
          <AppButton title="Sign In with Google" color="Light" handleClick={handleGoogleSignIn} />
        </View>

        {/* <View style={styles.signupContainer}>
          <Text style={[styles.terms, { color: '#A2A2A2' }]}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/screens/signup' })}>
            <Text style={styles.terms}>Create account</Text>
          </TouchableOpacity>
        </View> */}

        {notification.show && (
          <Notification
            status={notification.status}
            message={notification.message}
            switchShowOff={() => setNotification((prev) => ({ ...prev, show: false }))}
          />
        )}

        <Modal
          transparent={true}
          animationType="fade"
          visible={isLoading}
          onRequestClose={() => {}}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.modalText}>Signing In - Please wait...</Text>
            </View>
          </View>
        </Modal>
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
  },
  buttonContainers: {
    width: '100%',
    marginTop: 50,
    gap: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  selectedText: {
    flexShrink: 1,
    fontSize: 15,
    fontStyle: 'normal',
    fontWeight: '400',
    color: 'grey',
    width: '100%',
  },
  inputContainer: {
    position: 'relative',
    zIndex: 1,
    borderColor: '#E4E4E4',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#F7F7F7',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginTop: 5,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    marginTop: 10,
    fontSize: 16,
  },
});
