// import React, { useState, useEffect } from 'react';
// import { Stack } from 'expo-router';
// import { StyleSheet, View, Image } from 'react-native';
// import Map from '~/components/Map';
// import Mapbox from '@rnmapbox/maps';

// const Home = () => {
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     // Simulate content loading
//     const timer = setTimeout(() => {
//       setIsLoading(false);
//     }, 2000);

//     return () => clearTimeout(timer);
//   }, []);

//   return (
//     <>

//  <Stack.Screen options={{ title: 'Onboard', headerShown: false }} />
//       <View style={styles.container}>
//         {isLoading ? (
//           <View style={styles.loadingContainer}>
//             <Image source={require('../../assets/poynt.png')} style={styles.loadingImage} />
//           </View>
//         ) : (
//           <Map />
//         )}
//       </View>
//     </>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FDF6E6',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingImage: {
//     width: 235,
//     height: 235,
//     resizeMode: 'contain',
//     flexShrink: 0,
//   },
// });

// export default Home;
