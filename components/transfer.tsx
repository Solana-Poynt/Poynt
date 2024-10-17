import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useOkto, type OktoContextType } from 'okto-sdk-react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCodeScanner from './qr';

interface TransferTokensProps {
  isModalVisible: boolean;
  setIsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isSuccess: boolean;
  setIsSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}

const TransferTokens: React.FC<TransferTokensProps> = ({
  isModalVisible,
  setIsModalVisible,
  isSuccess,
  setIsSuccess,
}) => {
  const { transferTokens } = useOkto() as OktoContextType;
  const [quantity, setQuantity] = useState('0');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
  const [usdValue, setUsdValue] = useState('0.00');

  const tokenAddress = '';
  const networkName = 'SOLANA_DEVNET';
  const SOL_PRICE = 140; // Price of SOL_DEVNET in USD

  useEffect(() => {
    const numericQuantity = parseFloat(quantity) || 0;
    setUsdValue((numericQuantity * SOL_PRICE).toFixed(2));
  }, [quantity]);

  const handleSubmit = () => {
    transferTokens({
      network_name: networkName,
      token_address: tokenAddress,
      recipient_address: recipientAddress,
      quantity,
    })
      .then((result) => {
        console.log('Transfer success', result);
        setIsModalVisible(false);
        setIsSuccess(true);
      })
      .catch((error) => {
        console.log('Transfer error', error);
      });
  };

  const handleQRCodeScanned = (scannedAddress: string) => {
    setRecipientAddress(scannedAddress);
    setIsQRScannerVisible(false);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={() => setIsModalVisible(false)}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.title}>Transfer Tokens</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Recipient Address</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={recipientAddress}
                  onChangeText={(value) => setRecipientAddress(value)}
                  placeholder="Enter Recipient Address"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => setIsQRScannerVisible(true)}>
                  <Ionicons name="qr-code-outline" size={24} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Quantity (SOL_DEVNET)</Text>
              <TextInput
                style={styles.quantity}
                value={quantity}
                onChangeText={(value) => setQuantity(value)}
                placeholder="Enter Quantity"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              <Text style={styles.usdValue}>${usdValue} USD</Text>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent={false}
        visible={isQRScannerVisible}
        onRequestClose={() => setIsQRScannerVisible(false)}>
        <QRCodeScanner
          onQRCodeScanned={handleQRCodeScanned}
          onCancel={() => setIsQRScannerVisible(false)}
        />
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F8F8F8',
  },
  quantity: {
    height: 50,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F8F8F8',
  },
  qrButton: {
    padding: 10,
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: '#801414',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
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
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  usdValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  subText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    minWidth: 100,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default TransferTokens;
