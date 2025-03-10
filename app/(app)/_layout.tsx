import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomNav from '~/components/BottomNav';
import { View, StyleSheet } from 'react-native';
// import AppLoading from 'expo-app-loading';

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1  }}>
      <View style={styles.container}>
        <Stack.Screen options={{ title: '', headerShown: false }} />
        <Stack />
        <BottomNav />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
});
