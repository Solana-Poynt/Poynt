import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import BottomNav from '~/components/BottomNav';
import { StoreProvider } from '../store/provider';
// import { OktoProvider } from "okto-sdk-react-native";
import { BuildType } from 'okto-sdk-react-native';

// const EXPO_PUBLIC_OKTO_CLIENT_API: any = process.env.EXPO_PUBLIC_OKTO_CLIENT_API;

export default function Layout() {
  const [fontsLoaded] = useFonts({
    'Inter-Italic': require('../assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf'),
    'Inter-VariableFont': require('../assets/fonts/Inter-VariableFont_opsz,wght.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    // <OktoProvider
    //   apiKey={EXPO_PUBLIC_OKTO_CLIENT_API}
    //   buildType={BuildType.SANDBOX}
    // >
    <GestureHandlerRootView style={{ flex: 1, }}>
      <StoreProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </StoreProvider>
    </GestureHandlerRootView>
    // </OktoProvider>
  );
}
