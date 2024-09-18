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

function ResetScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Reset', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.backBtn}>
          <BackButton link={'/screens/login'} />
        </View>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.recoverText}>Enter a new password for your account</Text>
        <View style={styles.content}>
          <View style={styles.inputContainers}>
            <Image source={require('../../assets/key.png')} resizeMode="contain" />
            <TextInput
              style={styles.inputElements}
              placeholder="New Password"
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
        </View>

        <View style={styles.buttonContainers}>
          <AppButton title={'Change Password'} color={'Dark'} link={'/screens/login'} />
        </View>
      </SafeAreaView>
    </>
  );
}

export default ResetScreen;

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
