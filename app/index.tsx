import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, Stack } from 'expo-router';
import AppButton from '~/components/appButton';
import { View, SafeAreaView, ImageBackground, Dimensions, FlatList } from 'react-native';
import { StyleSheet, FlatList as FlatListType } from 'react-native';
import { getDataFromAsyncStorage, saveDataToAsyncStorage } from '~/utils/localStorage';
import { Text, ActivityIndicator, Image } from 'react-native';

// Move static data outside component
const onboardData = [
  {
    image: require('../assets/onboard.png'),
    desc: 'Watch Ads, Earn Rewards, Pay Less',
    isSelected: true,
  },
  {
    image: require('../assets/onboard.png'),
    desc: 'Happy Business, Happy User',
    isSelected: false,
  },
  {
    image: require('../assets/onboard.png'),
    desc: 'Contribute, interact, and earn Poynts',
    isSelected: false,
  },
];

const { width } = Dimensions.get('window');

interface OnboardItem {
  image: any;
  desc: string;
  isSelected: boolean;
}

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const router = useRouter();
  const flatListRef = useRef<FlatListType<OnboardItem>>(null); 

  // Handler functions using useCallback
  const handleLoginFlag = useCallback(async () => {
    try {
      await saveDataToAsyncStorage('userHasOnboarded', 'true');
      router.push('/screens/login');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      router.push('/screens/login');
    }
  }, [router]);

  const checkUserStatus = useCallback(async () => {
    try {
      const userHasOnboarded = await getDataFromAsyncStorage('userHasOnboarded');
      const refreshToken = await getDataFromAsyncStorage('refreshToken');

      if (refreshToken) {
        router.replace('/screens/home');
      } else if (userHasOnboarded === 'true') {
        router.replace('/screens/login');
      } else {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('🔍 Error in checkUserStatus:', error);
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkUserStatus();
  }, [checkUserStatus]);

  const renderOnboardingScreen = useCallback(
    ({ item, index }: { item: OnboardItem; index: number }) => {
      return (
        <View style={styles.slideContainer}>
          <ImageBackground source={item.image} style={styles.backgroundImage} resizeMode="cover">
            <View style={styles.bottomContentContainer}>
              <Text style={styles.introText}>{item.desc}</Text>
            </View>
          </ImageBackground>
        </View>
      );
    },
    []
  );

  const handleScroll = useCallback(
    (event: any) => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollPosition / width);
      if (index !== currentIndex) {
        setCurrentIndex(index);
      }
    },
    [currentIndex]
  );

  // Render - use conditional rendering AFTER all hooks are defined
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

  if (!showOnboarding) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#B71C1C" />
      </View>
    );
  }

  // Main render for onboarding screen
  return (
    <>
      <Stack.Screen options={{ title: 'Onboard', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={onboardData}
          renderItem={renderOnboardingScreen}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          initialScrollIndex={0}
          keyExtractor={(_, index) => index.toString()}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        <View style={styles.controlsContainer}>
          {/* Pagination dots */}
          <View style={styles.paginationContainer}>
            {onboardData.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex ? styles.paginationDotActive : {},
                ]}
              />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainers}>
            <AppButton title="Join Now" color="Dark" handleClick={handleLoginFlag} />
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6E6',
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
  slideContainer: {
    width: width,
    height: '100%',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bottomContentContainer: {
    width: '100%',
    height: '33%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  introText: {
    fontFamily: 'Inter-VariableFont',
    width: '100%',
    fontSize: 24,
    fontStyle: 'normal',
    lineHeight: 32,
    color: '#FDF6E6',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  paginationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D9D9D9',
    marginHorizontal: 5,
  },
  paginationDotActive: {
    backgroundColor: '#B71C1C',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  buttonContainers: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});