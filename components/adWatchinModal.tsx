import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useAdContext } from '~/utils/adContext';
import { useSendDataMutation } from '~/store/api/api';
import Notification from './Notification';

interface AdWatchingModalProps {
  isVisible: boolean;
  onComplete: () => void;
  driverId: string;
}

const AdWatchingModal: React.FC<AdWatchingModalProps> = ({ isVisible, onComplete, driverId }) => {
  const [countdown, setCountdown] = useState(10);
  const [isCountdownComplete, setIsCountdownComplete] = useState(false);
  const [notification, setNotification] = useState({ message: '', status: '', show: false });
  const { setAdWatched } = useAdContext();
  const [fund] = useSendDataMutation();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVisible && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsCountdownComplete(true);
      handleSendPoyntsToDriver();
    }
    return () => clearInterval(timer);
  }, [isVisible, countdown]);

  const handleSendPoyntsToDriver = async () => {
    try {
      const request: any = await fund({
        url: 'user/fundPoynt/',
        data: { driverId: driverId || '66f17add410e5fa5d5a05522', poyntValue: '30' },
        type: 'PATCH',
      });

      if (request?.data) {
        setNotification({ message: 'Ad Watched Successfully', status: 'success', show: true });
        setAdWatched(true);
      } else {
        throw new Error(request?.error?.data?.error || 'An error occurred');
      }
    } catch (error: any) {
      setNotification({
        message: error.message || 'Check Internet Connection and try again',
        status: 'error',
        show: true,
      });
    }
  };

  const handleClose = () => {
    setCountdown(10);
    setIsCountdownComplete(false);
    onComplete();
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <SafeAreaView style={styles.modalContainer}>
        {isCountdownComplete ? (
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Close Ad</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.countdownText}>{countdown}</Text>
        )}

        <Image source={require('../assets/seeeker.gif')} style={styles.adImage} />

        {notification.show && (
          <Notification
            status={notification.status}
            message={notification.message}
            switchShowOff={() => setNotification((prev) => ({ ...prev, show: false }))}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  adImage: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
  },
  countdownText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
    position: 'absolute',
    top: 100,
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    position: 'absolute',
    top: 40,
    right: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default AdWatchingModal;
