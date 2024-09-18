import React from 'react';
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

function SignUpScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Signup', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.backBtn}>
          <BackButton link={'/'} />
        </View>
        <Text style={styles.title}>Create Account</Text>
        <View style={styles.content}>
          <View style={styles.inputContainers}>
            <Image source={require('../../assets/user.png')} resizeMode="contain" />
            <TextInput
              style={styles.inputElements}
              placeholder="Name"
              placeholderTextColor={'gray'}
              secureTextEntry
            />
          </View>
          <View style={styles.inputContainers}>
            <Image source={require('../../assets/mail.png')} resizeMode="contain" />
            <TextInput
              style={styles.inputElements}
              placeholder="Email address"
              placeholderTextColor={'gray'}
              secureTextEntry
            />
          </View>
          <View style={styles.inputContainers}>
            <Image source={require('../../assets/key.png')} resizeMode="contain" />
            <TextInput
              style={styles.inputElements}
              placeholder="Password"
              placeholderTextColor={'gray'}
              secureTextEntry
            />
          </View>
          <View style={styles.inputContainers}>
            <Image source={require('../../assets/key.png')} resizeMode="contain" />
            <TextInput
              style={styles.inputElements}
              placeholder="Repeat Password"
              placeholderTextColor={'gray'}
              secureTextEntry
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Image source={require('../../assets/check-circle.png')} resizeMode="contain" />
            <Text style={styles.terms}>Agree with terms and conditions</Text>
          </View>
        </View>

        <View style={styles.buttonContainers}>
          <AppButton title={'Create Account'} color={'Dark'} link={'/screens/login'} />
          <AppButton
            title={'Sign up with Google'}
            color={'Light'}
            link={'/screens/login'}
            image={'google'}
          />
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
          <Text style={[styles.terms, { color: '#A2A2A2' }]}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/screens/login' })}>
            <Text style={styles.terms}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

export default SignUpScreen;

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
    width: '100%',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 36,
    fontStyle: 'normal',
    fontFamily: 'Inter-VariableFont',
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
});
