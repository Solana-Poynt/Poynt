import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useGetUserQuery } from '../../../store/api/api';
import { IUser } from '~/app/interfaces/interfaces';
import { getDataFromAsyncStorage } from '~/utils/localStorage.js';

const QRCodeGenerator = () => {
  const [text, setText] = useState<string>(''); // State for the text input
  const [qrValue, setQRValue] = useState<string>(''); // State for the QR code value
  const [userInfo, setUserInfo] = useState<any>({ id: '', email: '', name: '' }); // State for the QR code value

  //MAKE CALL TO BACKEND TO FTECH USER DATA
  const { data: userData, isLoading: userIsLoading, error: userError } = useGetUserQuery();
  const user: IUser | undefined = userData && userData?.data;

  useEffect(() => {
    // Function to fetch data from AsyncStorage and generate QR code
    const generateQRCode = async () => {
      try {
        const id = await getDataFromAsyncStorage('id');
        const email = await getDataFromAsyncStorage('email');
        const name = await getDataFromAsyncStorage('name');
        if (id && email) {
          setQRValue(id); // Set the QR code value if input is not empty
          setUserInfo({ id, email, name });
        }
      } catch (error) {
        console.error('Error fetching data from AsyncStorage', error);
      }
    };

    generateQRCode(); // Call the function inside useEffect to run only once
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Contribute', headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.labelTop}>Your QR Code:</Text>

        {/* Display the QR code */}
        {qrValue ? (
          <View style={styles.qrContainer}>
            <QRCode value={qrValue} size={200} />
          </View>
        ) : null}

        <Text style={styles.label}>{userInfo.email}</Text>
        <Text style={styles.labelName}>{userInfo.name.toUpperCase()}</Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  labelName: {
    color: 'dodgerblue',
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
  input: {
    height: 40,
    borderColor: '#000',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  qrContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
});

export default QRCodeGenerator;
