import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { View } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';

import { initNetworkListener } from '../store/slices/isNetworkSlice';
import { dynamicClient } from '~/components/context/wallet';
import NetworkStatusBanner from '~/components/Network';
import TopLoadingModal from '~/components/Loader';

// polyfills
import { Buffer } from 'buffer';
import 'react-native-get-random-values';

global.TextEncoder = require('text-encoding').TextEncoder;
global.Buffer = Buffer;

export default function Layout() {
  const [fontsLoaded] = useFonts({
    'Inter-Italic': require('../assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf'),
    'Inter-VariableFont': require('../assets/fonts/Inter-VariableFont_opsz,wght.ttf'),
  });

  // Initialize network listener when app starts
  useEffect(() => {
    const unsubscribe = initNetworkListener(store.dispatch);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={<TopLoadingModal message="Preparing app..." />} persistor={persistor}>
        <View style={{ flex: 1 }}>
          {/* WebView needs to be in a persistent parent component */}
          <dynamicClient.reactNative.WebView />

          <GestureHandlerRootView style={{ flex: 1 }}>
            {/* Network status indicator that shows connection state */}
            <NetworkStatusBanner />

            <Stack
              screenOptions={{
                headerShown: false,
              }}
            />
          </GestureHandlerRootView>
        </View>
      </PersistGate>
    </Provider>
  );
}
