import React, { useEffect, useState } from 'react';
import { Platform, StatusBar, StyleSheet, View, Image, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

function EarningsScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Earnings', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.backImgContainer}
          onPress={() => router.push('/screens/profile')}>
          <Image source={require('../../../assets/previous.png')} resizeMode="contain" />
        </TouchableOpacity>

        <View style={styles.topContainer}>
          <TouchableOpacity style={[styles.connectButton]}>
            {/* <Text style={styles.connectText}>Connect wallet</Text> */}
            <Image source={require('../../../assets/subtract.png')} resizeMode="contain" />
          </TouchableOpacity>

          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <View style={styles.tierContainer}>
              <Text style={styles.tierText}>Tier</Text>
              <View style={styles.tierCircle}>
                <Text style={styles.tierNumber}>3</Text>
              </View>
            </View>

            <View style={styles.arrowButton}>
              <Image source={require('../../../assets/send.png')} resizeMode="contain" />
            </View>
          </View>

          <View
            style={{
              marginTop: 26,
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24,
            }}>
            <View style={styles.display}>
              <Text style={styles.displayText}>Your Earning</Text>
              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                }}>
                <Image source={require('../../../assets/coin.png')} resizeMode="contain" />
                <Text style={styles.earning}>10.00k</Text>
              </View>
            </View>

            <View style={styles.display}>
              <Text style={styles.displayText}>Today's Earning</Text>
              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                }}>
                <Image source={require('../../../assets/coin.png')} resizeMode="contain" />
                <Text style={styles.earning}>500</Text>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            marginTop: 24,
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Text style={styles.activitiesText}>Activities</Text>
          <View style={styles.daily}>
            <Text style={styles.dailyText}>Daily</Text>
            <Image source={require('../../../assets/down.png')} resizeMode="contain" />
          </View>
        </View>

        <Image
          style={styles.chartImg}
          source={require('../../../assets/chart.png')}
          resizeMode="contain"
        />

        <View style={styles.listItems}>
          <TouchableOpacity onPress={() => {}} style={styles.listItem}>
            <Image source={require('../../../assets/add-user.png')} />
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Text style={styles.listItemText}>Referrals</Text>
              <View style={styles.tierCircle}>
                <Text style={styles.tierNumber}>0</Text>
              </View>
            </View>
            <Image source={require('../../../assets/down.png')} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {}} style={styles.listItem}>
            <Image source={require('../../../assets/history.png')} />
            <Text style={styles.listItemText}>Transaction History</Text>
            <Image source={require('../../../assets/down.png')} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

export default EarningsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backImgContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  topContainer: {
    marginTop: 30,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    position: 'relative',
  },
  tierContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 10,
  },
  tierText: {
    fontFamily: 'Inter-VariableFont',
    color: '#000',
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'normal',
    lineHeight: 20,
    fontWeight: '400',
  },
  tierCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#B71C1C',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  tierNumber: {
    fontFamily: 'Inter-VariableFont',
    fontSize: 16,
    fontStyle: 'normal',
    lineHeight: 20,
    fontWeight: '700',
    color: '#575757',
  },
  connectButton: {
    flex: 1,
    // backgroundColor: '#650F0F',
    // paddingVertical: 10,
    // paddingHorizontal: 20,
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    // borderBottomLeftRadius: 0,
    // borderBottomRightRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -10,
    right: '17%',
  },
  connectText: {
    fontFamily: 'Inter-VariableFont',
    color: '#FFFFFF',
    fontSize: 14,
    fontStyle: 'normal',
    lineHeight: 20,
    fontWeight: '500',
  },
  arrowButton: {
    backgroundColor: '#B71C1C',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 56,
  },
  display: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    padding: 8,
    gap: 10,
  },
  displayText: {
    fontFamily: 'Inter-VariableFont',
    color: '#00000',
    fontSize: 12,
    fontStyle: 'normal',
    lineHeight: 20,
    fontWeight: '400',
  },
  earning: {
    fontFamily: 'Inter-VariableFont',
    color: '#575757',
    fontSize: 18,
    fontStyle: 'normal',
    lineHeight: 24,
    fontWeight: '700',
  },
  activitiesText: {
    fontFamily: 'Inter-VariableFont',
    color: '#000000',
    fontSize: 16,
    fontStyle: 'normal',
    lineHeight: 24,
    fontWeight: '500',
  },
  daily: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 100,
  },
  dailyText: {
    color: '#575757',
    fontSize: 14,
    fontStyle: 'normal',
    lineHeight: 20,
    fontWeight: '400',
  },
  chartImg: {
    width: '100%',
    marginTop: 16,
  },
  listItems: {
    marginTop: 20,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  listItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 8,
    backgroundColor: '#F7F7F7',
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
  },
  listItemText: {
    fontFamily: 'Inter-VariableFont',
    flex: 2,
    textAlign: 'left',
    color: '#000000',
    fontSize: 16,
    fontStyle: 'normal',
    lineHeight: 24,
    fontWeight: '500',
  },
});
