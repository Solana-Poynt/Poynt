import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { IButton } from '~/app/interfaces/interfaces';

export default function BackButton({ link }: IButton) {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push({ pathname: link ? link : '/' })}>
      <Image
        source={require('../assets/back.png')}
        resizeMode="contain"
        style={styles.imageStyle}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageStyle: {
    width: 30,
    height: 30,
  },
});
