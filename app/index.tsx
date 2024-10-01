import React, { useEffect, useState } from 'react';
import {
  Button,
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
  Image,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AppButton from '~/components/appButton';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { getDataFromAsyncStorage, saveDataToAsyncStorage } from '~/utils/localStorage.js';

function OnBoardScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  async function saveUserHasOpenedApp() {
    const userHasOpenedApp = await saveDataToAsyncStorage('userHasOpenedApp', true);
  }
  saveUserHasOpenedApp();
  async function checkIfUserHasOpenedApp() {
    const userHasOpenedApp = await getDataFromAsyncStorage('userHasOpenedApp');
    const refreshToken = await getDataFromAsyncStorage('refreshToken');

    if (userHasOpenedApp) {
      router.push({ pathname: '/screens/login' });
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      await checkIfUserHasOpenedApp();
    };
    checkUser();
  }, []);

  const onboardData = [
    {
      desc: 'Get real-time personalized updates and navigation',
      isSelected: true,
      source: 'map',
    },
    {
      desc: 'Avoid traffic, danger and  navigate with the best route',
      isSelected: false,
      source: 'route',
    },
    {
      desc: 'contribute, interact, navigate and earn points',
      isSelected: false,
      source: 'earn',
    },
  ];

  // Function to handle swipe gestures
  const handleSwipe = (direction: any) => {
    if (direction === 'left' && currentIndex < onboardData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // This triggers when swipe completes
  const onHandlerStateChange = (event: any) => {
    const { translationX, state } = event.nativeEvent;

    if (state === State.END) {
      if (translationX < -100) {
        handleSwipe('left');
      } else if (translationX > 100) {
        handleSwipe('right');
      }
    }
  };

  const currentItem = onboardData[currentIndex];

  const dotItems = onboardData.map((item, index) => (
    <View
      key={index}
      style={[styles.circle, index === currentIndex ? styles.filled : styles.empty]}></View>
  ));

  return (
    <>
      <Stack.Screen options={{ title: 'Onboard', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.circleContainer}>{dotItems}</View>

        {/* Gesture Handler */}
        <PanGestureHandler onHandlerStateChange={onHandlerStateChange}>
          <Animated.View style={{ width: '100%', alignItems: 'center' }}>
            <Image
              source={
                currentItem.source === 'map'
                  ? require('../assets/map.png')
                  : currentItem.source === 'route'
                    ? require('../assets/route.png')
                    : require('../assets/earn.png')
              }
              resizeMode="contain"
              style={styles.imageStyle}
            />
            <Text style={styles.introText}>{currentItem.desc}</Text>
          </Animated.View>
        </PanGestureHandler>

        <View style={styles.buttonContainers}>
          <AppButton title={'Get Started'} color={'Dark'} link={'/screens/signup'} />
          <AppButton title={'Login'} color={'Light'} link={'/screens/login'} />
        </View>
      </SafeAreaView>
    </>
  );
}

export default OnBoardScreen;

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
  circleContainer: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  circle: {
    width: 12,
    height: 12,
    backgroundColor: '#B71C1C',
    borderRadius: 6,
  },
  filled: {
    backgroundColor: '#B71C1C',
  },
  empty: {
    backgroundColor: '#D9D9D9',
  },
  imageStyle: {
    width: 250,
    height: 250,
    marginTop: 90,
  },
  introText: {
    fontFamily: 'Inter-VariableFont',
    width: '100%',
    fontSize: 21,
    fontStyle: 'normal',
    lineHeight: 32,
    color: '#000000',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 50,
  },
  buttonContainers: {
    width: '100%',
    marginTop: 110,
    gap: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
