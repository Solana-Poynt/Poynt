import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useWeatherInfo, useWeatherAnalysis } from '~/hooks/useLocation';
import PulsingLoadingCard from '~/components/Loader';
import { useGetUserQuery } from '../../../store/api/api';
import IconCircleProgress from '~/components/icons/icons';
import { IUser } from '~/app/interfaces/interfaces';

const Home: React.FC = () => {
  const { currentWeather, isLoading, userTime, refreshWeather } = useWeatherInfo();
  const {
    heatPrediction,
    rainPrediction,
    uvPrediction,
    windPrediction,
    visibilityPrediction,
    extremePrediction,
  } = useWeatherAnalysis(currentWeather);
  const [modalVisible, setModalVisible] = useState(false);

  const currentLocation = currentWeather
    ? `${currentWeather.name}, ${currentWeather.region},`
    : 'Location unavailable';

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  //MAKE CALL TO BACKEND TO FTECH USER DATA
  let user: IUser | null;
  const { data: userData, isLoading: userIsLoading, error: userError } = useGetUserQuery();
  user = userIsLoading ? null : (userData?.data ?? null);

  return (
    <>
      <Stack.Screen options={{ title: 'Onboard', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.giftButton}>
            <View style={styles.giftIcon}>
              <Ionicons name="gift" size={19} color="black" />
            </View>

            <Text style={styles.giftText}>coming soon!</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity>
            <Ionicons name="notifications" size={24} color="" />
          </TouchableOpacity> */}
        </View>
        <Text style={styles.greeting}>Hello, {user?.name && user?.name}</Text>

        <View style={styles.timerContainer}>
          <Text style={{ fontSize: 13, marginLeft: 8, marginTop: 12 }}>{userTime}</Text>

          <Text style={styles.balance}>poynts</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <PulsingLoadingCard />
          </View>
        ) : (
          <View style={{ marginBottom: 16 }}>
            <View style={styles.locationCard}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <Text style={styles.locationTitle}>Current Location</Text>
                <Text style={styles.weatherTitle}>Traffic</Text>
              </View>

              <View style={styles.locationInfo}>
                <View style={{ flexDirection: 'column' }}>
                  <Text style={styles.locationName}>{currentLocation}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.locationName}>{currentWeather?.country}</Text>
                    <TouchableOpacity onPress={toggleModal} style={styles.infoButton}>
                      <Ionicons name="information-circle" size={20} color="#E9B9B9" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.otherInfo}>
                  <View>
                    <Text style={styles.traffic}></Text>
                  </View>
                </View>
              </View>
              {/* /////////////////// */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <Text style={styles.weatherTitle}>Weather</Text>
                <Text style={styles.weatherTitle}>Condition</Text>
              </View>
              <View style={styles.weatherInfo}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}>
                  <Text style={styles.temperature}>{currentWeather?.temp_c}°C</Text>
                  <Image
                    source={{ uri: `https:${currentWeather?.icon}` }}
                    style={{ width: 40.32, height: 40.32 }}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 16,
                    color: 'white',
                    fontWeight: '600',
                  }}>
                  {currentWeather?.condition}
                </Text>
              </View>
            </View>

            <View style={styles.cardPart}></View>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignContent: 'center',
            marginTop: 2,
          }}>
          <TouchableOpacity onPress={refreshWeather} style={{}}>
            <Ionicons name="refresh-circle" size={32} color="#A71919" />
          </TouchableOpacity>
        </View>

        {/* Places And all  */}
        <View style={{ marginBottom: 16, marginTop: 32 }}>
          <View style={styles.savedPlace}>
            <View style={styles.addPlace}>
              <Ionicons name="car-sport" size={22} color="black" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                }}>
                Ready to go?
              </Text>

              <View
                style={{
                  borderWidth: 1,
                  borderRadius: 32,
                  padding: 3,
                  borderColor: '#eeeeee',
                  backgroundColor: '#eeeeee',
                }}>
                <TouchableOpacity onPress={() => router.push('/screens/navigate')}>
                  <Ionicons name="arrow-forward" size={24} color="black" />
                </TouchableOpacity>
              </View>
            </View>
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                }}>
                Ride Smart, Save Big with Poynt!
              </Text>
            </View>

            {/* ////////////////////// */}
          </View>
          <View style={styles.placePart}></View>
        </View>

        {/* modal view  */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={toggleModal}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  textAlign: 'center',
                }}>
                Real Time Weather Information
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}>
                {/* ////heat prediction  */}
                <View style={[styles.analysisText, styles.gridItem]}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%',
                      justifyContent: 'flex-start',
                      paddingLeft: 12,
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <MaterialCommunityIcons name="sun-thermometer" size={25} color="#e27800" />
                    <View
                      style={{
                        flexDirection: 'column',
                        gap: 3,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: 'black',
                        }}>
                        Heat
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '300',
                          color: 'black',
                        }}>
                        {heatPrediction}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* rain prediction  */}

                <View style={[styles.analysisText, styles.gridItem]}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%',
                      justifyContent: 'flex-start',
                      paddingLeft: 12,
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <Ionicons name="rainy-sharp" size={25} color="blue" />
                    <View
                      style={{
                        flexDirection: 'column',
                        gap: 3,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: 'black',
                        }}>
                        Rain
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '300',
                          color: 'black',
                        }}>
                        {rainPrediction}
                      </Text>
                    </View>
                  </View>
                </View>
                {/* UV analysis */}
                <View style={[styles.analysisText, styles.gridItem]}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%',
                      justifyContent: 'flex-start',
                      paddingLeft: 12,
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <Ionicons name="sunny-sharp" size={25} color="red" />
                    <View
                      style={{
                        flexDirection: 'column',
                        gap: 3,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: 'black',
                        }}>
                        UV
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '300',
                          color: 'black',
                        }}>
                        {uvPrediction}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.analysisText, styles.gridItem]}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%',
                      justifyContent: 'flex-start',
                      paddingLeft: 12,
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <MaterialCommunityIcons name="weather-windy" size={25} color="black" />
                    <View
                      style={{
                        flexDirection: 'column',
                        gap: 3,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: 'black',
                        }}>
                        Wind
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '300',
                          color: 'black',
                        }}>
                        {windPrediction}
                      </Text>
                    </View>
                  </View>
                </View>
                {/* visibility  */}

                <View style={[styles.analysisText, styles.gridItem]}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%',
                      justifyContent: 'flex-start',
                      paddingLeft: 12,
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <MaterialCommunityIcons name="eye-circle" size={25} color="green" />
                    <View
                      style={{
                        flexDirection: 'column',
                        gap: 3,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: 'black',
                        }}>
                        Visibility
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '300',
                          color: 'black',
                        }}>
                        {visibilityPrediction}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* extreme  */}

                <View style={[styles.analysisText, styles.gridItem]}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%',
                      justifyContent: 'flex-start',
                      paddingLeft: 12,
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <MaterialCommunityIcons name="alert-box" size={25} color="#A71919" />
                    <View
                      style={{
                        flexDirection: 'column',
                        gap: 3,
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: 'black',
                        }}>
                        Extreme
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '300',
                          color: 'black',
                        }}>
                        {extremePrediction}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={toggleModal}>
                <Text style={styles.textStyle}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
  },

  giftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  giftIcon: {
    backgroundColor: '#dad7cd',
    padding: 4,
    borderRadius: 40,
  },
  giftText: {
    marginLeft: 5,
    color: 'black',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 32,
  },

  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  date: {
    fontSize: 16,
    color: '#666',
  },
  balance: {
    fontSize: 14,
    fontWeight: '900',
    backgroundColor: '#F8E8E8',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    justifyContent: 'center',
    borderWidth: 1,
    letterSpacing: 0.5,
    borderColor: '#F8E8E8',
    shadowColor: 'rgba(0, 0, 0, 0.10)',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 25,
  },

  loadingContainer: {
    marginTop: 10,
  },

  locationCard: {
    flexDirection: 'column',
    backgroundColor: '#A71919',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 8,
    width: '100%',
    zIndex: 2,
    shadowColor: 'rgba(199, 72, 72, 0.25)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },

  cardPart: {
    backgroundColor: '#e5baba',
    position: 'absolute',
    width: '100%',
    height: 32,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 21,
    marginTop: 6,
    bottom: -4.5,
    zIndex: -2,
    shadowColor: 'rgba(199, 72, 72, 0.25)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  locationTitle: {
    color: '#DE9797',
    fontSize: 12,
    fontWeight: '500',
  },
  locationName: {
    flexWrap: 'wrap',
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 5,
  },

  weatherIcon: {
    position: 'absolute',
    top: 0,
    left: 62,
  },

  weatherTitle: {
    color: '#DE9797',
    fontSize: 12,
    fontWeight: '500',
  },
  temperature: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  weatherCondition: {
    color: '#FFF',
    fontSize: 14,
  },

  otherInfo: {
    flexDirection: 'row',
    marginTop: 6,
    justifyContent: 'space-between',
    // alignItems: 'center',
  },

  trafficInfo: {},
  traffic: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  placeName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  distanceText: {
    marginLeft: 5,
    marginRight: 10,
  },
  weatherText: {
    marginLeft: 5,
  },
  activityIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  activityItem: {
    alignItems: 'center',
  },
  activityTime: {
    marginTop: 5,
    fontSize: 12,
  },
  modalView: {
    backgroundColor: '#edd1d1',
    flexDirection: 'column',
    gap: 20,
    borderRadius: 20,
    padding: 12,
    margin: 10,
    // alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 50,
    maxHeight: '60%',
  },

  gridItem: {
    width: '49%',
    marginBottom: 5,
  },
  analysisText: {
    backgroundColor: '#FCEAEA',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 45,
    borderBottomWidth: 3,
    paddingBottom: 3,
    borderBottomColor: 'white',
  },
  modalWeatherInfo: {
    borderWidth: 3,
    borderColor: 'white',
    padding: 14,
    borderRadius: 12,
  },
  modalText: {
    marginBottom: 15,
    // textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#A71919',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    // marginTop: 35,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  infoButton: {
    marginTop: 7,
  },

  savedPlace: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 25,
    backgroundColor: 'white',
    flexDirection: 'column',
    justifyContent: 'space-around',
    shadowColor: '#0005',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 14,
    alignItems: 'center',
    marginVertical: 18,
  },

  addPlace: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    paddingBottom: 12,
    borderBottomColor: '#eeeeee',
  },
  placeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeIcons: {
    flexDirection: 'column',
    gap: 9,
    alignItems: 'center',
  },
  placePart: {
    backgroundColor: '#eeeeee',
    position: 'absolute',
    width: '100%',
    height: 32,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 21,
    marginTop: 6,
    bottom: 9,
    zIndex: -2,
    shadowColor: 'rgba(199, 72, 72, 0.25)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
});

export default Home;
