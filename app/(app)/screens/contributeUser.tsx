import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Stack } from 'expo-router';
import {
  AppState,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Button,
} from 'react-native';
import { Overlay } from './overlay';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const qrLock = useRef(false);
  const appState = useRef(AppState.currentState);
  const [permission, requestPermission] = useCameraPermissions(); // Request permissions
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        qrLock.current = false;
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Request camera permissions when the component mounts
    (async () => {
      const { status } = await requestPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) {
    // Permissions are still loading
    return (
      <View>
        <Text>Requesting for camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    // Permissions were not granted
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to use the camera</Text>
        <Button onPress={requestPermission} title="Grant Camera Permission" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Contribute', headerShown: false }} />
      <SafeAreaView style={StyleSheet.absoluteFillObject}>
        {Platform.OS === 'android' ? <StatusBar hidden /> : null}
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={({ data }) => {
            if (data && !qrLock.current) {
              qrLock.current = true;
              setTimeout(async () => {
                await Linking.openURL(data);
              }, 500);
            }
          }}
        />
        <Overlay />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
