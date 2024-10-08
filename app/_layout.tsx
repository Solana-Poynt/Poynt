import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import BottomNav from '~/components/BottomNav';
import { StoreProvider } from '../store/provider';

export default function Layout() {
  const [fontsLoaded] = useFonts({
    'Inter-Italic': require('../assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf'),
    'Inter-VariableFont': require('../assets/fonts/Inter-VariableFont_opsz,wght.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider>
        <Stack />
      </StoreProvider>
    </GestureHandlerRootView>
  );
}
