import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import { IButton } from '~/app/interfaces/interfaces';

export default function AppButton({ title, color, link, handleClick, image }: IButton) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        color === 'Dark' ? { backgroundColor: '#B71C1C' } : { backgroundColor: '#EDEDED' },
      ]}
      onPress={() =>
        link ? router.push({ pathname: link ? link : '/' }) : handleClick ? handleClick() : ''
      }>
      {image && (
        <Image
          source={image === 'google' ? require('../assets/google.png') : ''}
          resizeMode="contain"
        />
      )}
      <Text
        style={[styles.buttonText, color === 'Dark' ? { color: '#FFFFFF' } : { color: '#000000' }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 100,
    paddingTop: 16,
    paddingBottom: 16,
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'normal',
    lineHeight: 24,
    textAlign: 'center',
  },
});
