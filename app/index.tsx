import { useState, useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import AppButton from '~/components/appButton';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { View, SafeAreaView, ImageBackground, Dimensions } from 'react-native';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { getDataFromAsyncStorage, saveDataToAsyncStorage } from '~/utils/localStorage';
import { Text, ActivityIndicator, Image } from 'react-native';

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const translateX = useSharedValue(0);
  const screenWidth = Dimensions.get('window').width;

  // console.log('🔍 Rendering index.tsx (Onboarding screen)');

  useEffect(() => {
    checkUserStatus();
    return () => {};
  }, []);

  async function checkUserStatus() {
    setIsLoading(true);
    try {
      const userHasOpenedApp = await getDataFromAsyncStorage('userHasOpenedApp');

      const refreshToken = await getDataFromAsyncStorage('refreshToken');

      if (refreshToken) {
        // User is logged in, redirect to home
        router.replace('/screens/home');
      } else if (userHasOpenedApp) {
        // User has seen onboarding but not logged in, redirect to login
        router.replace('/screens/login');
      } else {
        // New user, show onboarding
        setShowOnboarding(true);
        await saveDataToAsyncStorage('userHasOpenedApp', true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('🔍 Error in checkUserStatus:', error);
      setIsLoading(false);
    }
  }

  // Render splash screen while loading
  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('../assets/trans.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  const onboardData = [
    {
      desc: 'Watch Ads, Earn Rewards, Pay Less',
      isSelected: true,
    },
    {
      desc: 'Happy Business, Happy User',
      isSelected: false,
    },
    {
      desc: 'contribute, interact, and earn points',
      isSelected: false,
    },
  ];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleGesture = (event: any) => {
    const { translationX } = event.nativeEvent;
    translateX.value = translationX;
  };

  const handleGestureEnd = (event: any) => {
    const { translationX } = event.nativeEvent;

    translateX.value = withSpring(0); // Reset position with spring animation

    if (translationX < -50 && currentIndex < onboardData.length - 1) {
      // Swipe left
      setCurrentIndex(currentIndex + 1);
    } else if (translationX > 50 && currentIndex > 0) {
      // Swipe right
      setCurrentIndex(currentIndex - 1);
    }
  };

  const dotItems = onboardData.map((item, index) => (
    <View
      key={index}
      style={[styles.circle, index === currentIndex ? styles.filled : styles.empty]}
    />
  ));

  return (
    <>
      <Stack.Screen options={{ title: 'Onboard', headerShown: false }} />
      <ImageBackground
        source={require('../assets/onboard.png')}
        style={styles.backgroundImage}
        resizeMode="cover">
        <SafeAreaView style={styles.container}>
          <PanGestureHandler onGestureEvent={handleGesture} onEnded={handleGestureEnd}>
            <Animated.View style={[styles.contentContainer, animatedStyle]}>
              <View style={styles.bottomContentContainer}>
                <Text style={styles.introText}>{onboardData[currentIndex].desc}</Text>

                <View style={styles.circleContainer}>{dotItems}</View>

                <View style={styles.buttonContainers}>
                  <AppButton title={'Login'} color={'Dark'} link={'/screens/login'} />
                </View>
              </View>
            </Animated.View>
          </PanGestureHandler>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF6E6',
  },
  splashImage: {
    width: '90%',
    height: '90%',
  },

  backgroundImage: {
    flex: 1,
    width: '40%',
    height: '40%',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bottomContentContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 56,
  },
  circleContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
  },
  circle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  filled: {
    backgroundColor: '#B71C1C',
  },
  empty: {
    backgroundColor: '#D9D9D9',
  },
  introText: {
    fontFamily: 'Inter-VariableFont',
    width: '100%',
    fontSize: 24,
    fontStyle: 'normal',
    lineHeight: 32,
    color: '#FDF6E6',
    fontWeight: '600',
    // textAlign: 'center',
    paddingTop: 29,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonContainers: {
    width: '100%',
    marginTop: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
