import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { saveDataToAsyncStorage, getDataFromAsyncStorage } from '~/utils/localStorage';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { setIsAuth } from '../../store/slices/isAuthSlice';
import { useSendDataMutation } from '../../store/api/api';
import Notification from '../../components/Notification';

// Configure Google Sign-In
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

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [signIn, { isLoading }] = useSendDataMutation();

  const [selectedRole, setSelectedRole] = useState('user');
  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    status: '',
    show: false,
  });

  console.log('🔍 Rendering RoleSelectionScreen');

  useEffect(() => {
    console.log('🔍 RoleSelectionScreen useEffect running');
    checkUserAuth();

    return () => {
      console.log('🔍 RoleSelectionScreen useEffect cleanup - component unmounted');
    };
  }, []);

  async function checkUserAuth() {
    try {
      const accessToken = await getDataFromAsyncStorage('accessToken');
      const refreshToken = await getDataFromAsyncStorage('refreshToken');

      if (accessToken && refreshToken) {
        router.replace('/screens/home');
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    }
  }

  const handleRoleSelection = (role: string) => {
    if (role === 'user') {
      setSelectedRole(role);
    }
  };

  function showNotification(message: string, status: string) {
    setNotification({ message, status, show: true });
  }

  // Safely save a value to AsyncStorage, only if it exists
  const safelyStoreData = async (key: string, value: any) => {
    try {
      if (value === undefined || value === null) {
        return Promise.resolve();
      }

      const stringValue = typeof value !== 'string' ? String(value) : value;
      return await saveDataToAsyncStorage(key, stringValue);
    } catch (error) {
      return Promise.resolve();
    }
  };

  async function handleSuccessfulLogin(loginData: any) {
    try {
      const { message, accessToken, refreshToken, data: user } = loginData;
      showNotification(message || 'Login successful', 'success');
      
      dispatch(
        setIsAuth({
          accessToken: accessToken || '',
          refreshToken: refreshToken || '',
          user: user || {},
        })
      );

      if (accessToken && refreshToken) {
        try {
          // Save authentication tokens
          await saveDataToAsyncStorage('accessToken', accessToken);
          await saveDataToAsyncStorage('refreshToken', refreshToken);

          // Always save the selected role first - this is the most important
          await safelyStoreData('role', selectedRole);

          // Then save the rest of the user data if available
          if (user && typeof user === 'object') {
            if (user._id) await safelyStoreData('id', user._id);
            if (user.email) await safelyStoreData('email', user.email);
            if (user.name) await safelyStoreData('name', user.name);
            // Don't save user.role, we're using selectedRole instead
          }

          // Navigate to home screen
          router.replace('/screens/home');
        } catch (error: any) {
          console.error('Error saving data to AsyncStorage:', error);
          showNotification(`Storage error: ${error.message}`, 'error');
        }
      } else {
        console.error('Missing required authentication tokens');
        showNotification('Login failed: Missing authentication tokens', 'error');
      }
    } catch (error: any) {
      console.error('Error in handleSuccessfulLogin:', error);
      showNotification(`Authentication error: ${error.message}`, 'error');
    }
  }

  const handleGoogleSignUp = async () => {
    if (isLoading) {
      return;
    }

    try {
      console.log('🔍 Starting Google Sign-In flow');
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log('🔍 Google Sign-In successful, user info received');

      // Log the structure to understand what we're getting back
      console.log('Google Sign-In response structure:', JSON.stringify(userInfo, null, 2));

      const photo = userInfo.data?.user.photo;
      await saveDataToAsyncStorage('photo', photo);

      // Extract token and user data based on the exact structure shown in console log
      const idToken = userInfo?.data?.idToken || null;
      const userData = userInfo?.data?.user;
      const name = userData?.name;
      const email = userData?.email;

      if (idToken) {
        try {
          const response: any = await signIn({
            url: 'auth/google',
            data: {
              name,
              idToken,
              email,
              role: selectedRole,
            },
            type: 'POST',
          });

          if (response?.data) {
            handleSuccessfulLogin(response.data);
          } else {
            throw new Error('Invalid server response');
          }
        } catch (apiError: any) {
          console.error('API Error:', apiError);
          const errorMessage = apiError?.data?.message || 'Server authentication failed';
          showNotification(errorMessage, 'error');
        }
      } else {
        showNotification('No authentication token received', 'error');
      }
    } catch (error: any) {
      console.error('🔍 Google Sign In Error:', error);

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
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sign Up', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Please sign up to continue</Text>

          <View style={styles.mainContainer}>
            <Image
              source={require('../../assets/User_circle.png')}
              style={styles.userIcon}
              resizeMode="contain"
            />

            <View style={styles.roleSelectionContainer}>
              <Text style={styles.roleSelectionTitle}>
                Choose your role to get the best experience tailored for you
              </Text>

              <TouchableOpacity
                style={[styles.roleOption, selectedRole === 'user' && styles.roleOptionSelected]}
                onPress={() => handleRoleSelection('user')}>
                <View style={styles.radioButton}>
                  {selectedRole === 'user' && <View style={styles.radioButtonInner} />}
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.passengerRoleTitle}>As a poynt user</Text>
                  <Text style={styles.roleDescription}>
                    Watch ads, earn Poynt and get discounts
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleOption, styles.disabledRoleOption]}
                onPress={() => {}}>
                <View style={[styles.radioButton, styles.disabledRadioButton]}>
                  {selectedRole === 'driver' && <View style={styles.radioButtonInner} />}
                </View>
                <View style={styles.roleTextContainer}>
                  <View style={styles.driverTitleContainer}>
                    <Text style={styles.roleTitle}>As a Poynt Agent</Text>
                    <View style={styles.comingSoonTag}>
                      <Text style={styles.comingSoonText}>Coming Soon</Text>
                    </View>
                  </View>
                  <Text style={[styles.roleDescription, styles.disabledText]}>
                    Receive payment and share ad links to help users save.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.disabledButton]}
            onPress={handleGoogleSignUp}
            disabled={isLoading}>
            <Text style={styles.googleButtonText}>
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>
        </View>

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
          statusBarTranslucent={true}
          onRequestClose={() => {}}>
          <View style={styles.modalBackdrop}>
            <View style={styles.loadingCard}>
              <View style={styles.loadingIconContainer}>
                <ActivityIndicator size="large" color="#B71C1C" />
              </View>
              <View style={styles.loadingTextContainer}>
                <Text style={styles.loadingTitle}>Authenticating</Text>
                <Text style={styles.loadingSubtext}>Please wait while we secure your account</Text>
              </View>
              <View style={styles.loadingProgressContainer}>
                <View style={styles.loadingProgressBar}>
                  <View style={[styles.loadingProgressIndicator, { width: '65%' }]} />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  mainContainer: {
    width: '100%',
    display: 'flex',
    borderRadius: 24,
    backgroundColor: '#FAFAFA',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 32,
    gap: 16,
  },
  contentContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 48,
    paddingBottom: 24,
    paddingHorizontal: 28,
    gap: 16,
    borderRadius: 24,
    backgroundColor: 'white',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
  },
  title: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 24,
    fontWeight: '700',
    color: '#575757',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 10,
  },
  userIcon: {
    position: 'absolute',
    alignItems: 'center',
    top: -44,
    width: 88,
    height: 88,
  },
  roleSelectionContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
  },
  roleSelectionTitle: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 40,
    color: '#555555',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
    paddingVertical: 8,
  },
  roleOptionSelected: {
    // Optional: add style for selected state
  },
  disabledRoleOption: {
    opacity: 0.7,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999999',
    marginRight: 12,
    marginTop: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledRadioButton: {
    borderColor: '#CCCCCC',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#B71C1C',
  },
  roleTextContainer: {
    flex: 1,
  },
  driverTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  comingSoonTag: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  comingSoonText: {
    color: '#606060',
    fontSize: 10,
    fontWeight: '600',
  },
  roleTitle: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  passengerRoleTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '700',
    lineHeight: 24,
    color: '#606060',
    marginBottom: 4,
  },
  roleDescription: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 14,
    color: '#777777',
  },
  disabledText: {
    color: '#999999',
  },
  googleButton: {
    backgroundColor: '#B71C1C',
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#d48a8a',
  },
  googleButtonText: {
    fontFamily: 'Inter-VariableFont',
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 340,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  loadingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(183, 28, 28, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingTextContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingProgressContainer: {
    width: '100%',
  },
  loadingProgressBar: {
    height: 6,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingProgressIndicator: {
    height: '100%',
    backgroundColor: '#B71C1C',
    borderRadius: 3,
  },
});
