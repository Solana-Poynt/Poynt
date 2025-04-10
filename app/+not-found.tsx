import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import ComingSoon from '~/components/coming';

import { Container } from '~/components/Container';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Container>
        <ComingSoon />
      </Container>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 16,
    paddingVertical: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
