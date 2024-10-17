import React, { useRef, useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image, Modal } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useRide from '~/hooks/useRide';
import { useAdContext } from '~/utils/adContext';
import TransferTokens from './transfer';

interface Place {
  id: string;
  name: string;
  coordinates: [number, number];
  distance?: number;
  rating?: number;
}

interface ViewPlaceProps {
  selectedPlace: Place;
  handleCancel: () => void;
  onWatchAdRequest: () => void;
}

const ViewPlace: React.FC<ViewPlaceProps> = ({ selectedPlace, handleCancel, onWatchAdRequest }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);

  const [isSolanaPaymentModalVisible, setIsSolanaPaymentModalVisible] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { adWatched } = useAdContext();

  const { distance, fare, eta } = useRide(distanceKm);

  useEffect(() => {
    bottomSheetRef.current?.expand();
    setDistanceKm(selectedPlace.distance ? selectedPlace.distance / 1000 : 0);
  }, [selectedPlace]);

  const calculateDiscountedFare = (originalFare: string) => {
    if (!adWatched) return originalFare;
    const fareValue = parseFloat(originalFare.replace('$', ''));
    const discountedFare = fareValue * 0.86; // 14% discount
    return `$${discountedFare.toFixed(2)}`;
  };

  const handleMakePayment = () => {
    setIsPaymentModalVisible(true);
  };

  const handlePayWithSolana = () => {
    setIsPaymentModalVisible(false);
    setIsSolanaPaymentModalVisible(true);
  };

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={[428]}
        enablePanDownToClose
        onClose={handleCancel}
        style={styles.bottomSheet}
        backgroundStyle={styles.bottomSheetBackground}>
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.header}>
            <Text style={styles.placeName}>{selectedPlace.name}</Text>
            <View style={styles.placeDistance}>
              <MaterialCommunityIcons name="map-marker-distance" size={24} color="white" />
              <Text style={styles.placeText}>{distanceKm.toFixed(2)} km</Text>
            </View>
          </View>

          <View style={styles.rideInfoContainer}>
            <Image style={styles.rideIcon} source={require('../assets/drive.png')} />
            <View style={styles.rideDetails}>
              <Text style={styles.rideType}>Drive</Text>
              <Text style={styles.rideEta}>ETA: {eta || '--'} mins</Text>
            </View>
            <View>
              <Text style={styles.rideFare}>{calculateDiscountedFare(`$${fare}` || '$0.00')}</Text>
              {adWatched && <Text style={styles.slashedFare}>${fare}</Text>}
            </View>
          </View>

          {adWatched ? (
            <View style={styles.discountAppliedContainer}>
              <Text style={styles.discountAppliedText}> Discount Applied!</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.watchAdsButton} onPress={onWatchAdRequest}>
              <Text style={styles.watchAdsText}>Watch Ad </Text>
            </TouchableOpacity>
          )}
          {isSuccess ? (
            <TouchableOpacity style={styles.bookButtonTextSuccess}>
              <Text style={styles.bookButtonText}>Payment Success</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.bookButton} onPress={handleMakePayment}>
              <Text style={styles.bookButtonText}>Make Payment</Text>
            </TouchableOpacity>
          )}
        </BottomSheetView>
      </BottomSheet>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPaymentModalVisible}
        onRequestClose={() => setIsPaymentModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Payment Method</Text>
            <TouchableOpacity style={[styles.paymentButton, styles.disabledButton]} disabled={true}>
              <Text style={styles.paymentButtonText}>Local (Coming Soon)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.paymentButton} onPress={handlePayWithSolana}>
              <Text style={styles.paymentButtonText}>Pay with Solana</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsPaymentModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isSolanaPaymentModalVisible && (
        <TransferTokens
          isModalVisible={isSolanaPaymentModalVisible}
          setIsModalVisible={setIsSolanaPaymentModalVisible}
          isSuccess={isSuccess}
          setIsSuccess={setIsSuccess}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  bottomSheet: {
    zIndex: 1000,
  },
  bottomSheetBackground: {
    backgroundColor: '#fff',
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 32,
  },
  placeName: {
    maxWidth: 220,
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#801414',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  placeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  visitButtons: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderColor: 'white',
    backgroundColor: 'white',
    shadowColor: '#0005',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  rideInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  rideIcon: {
    width: 80,
    height: 63,
  },
  rideDetails: {
    flexDirection: 'column',
    gap: 4,
  },
  rideType: {
    color: 'black',
    fontWeight: '600',
    fontSize: 16,
  },
  rideEta: {
    color: 'black',
    fontWeight: '600',
    fontSize: 14,
  },
  rideFare: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  watchAdsButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'grey',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  watchAdsText: {
    color: 'white',
  },
  bookButton: {
    backgroundColor: '#801414',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookButtonTextSuccess: {
    backgroundColor: 'green',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  discountAppliedContainer: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  discountAppliedText: {
    color: 'white',
    fontWeight: 'bold',
  },
  slashedFare: {
    textDecorationLine: 'line-through',
    color: 'gray',
    marginRight: 5,
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  paymentButton: {
    backgroundColor: '#801414',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  paymentButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
export default ViewPlace;
