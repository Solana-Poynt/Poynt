import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  Image,
  Text,
  Button,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connectWallet, disconnectWallet } from '~/components/walletConnect';
import { useOkto, type OktoContextType } from 'okto-sdk-react-native';
import GetButton from '~/components/GetButton';
import Ionicons from '@expo/vector-icons/Ionicons';
import Notification from '~/components/Notification';
import Clipboard from '@react-native-clipboard/clipboard';
import { getDataFromAsyncStorage, saveDataToAsyncStorage } from '~/utils/localStorage.js';

interface WalletInfo {
  address: string;
  networkName: string;
}

interface PortfolioInfo {
  tokens: any;
  amount: number;
}

function EarningsScreen() {
  const router = useRouter();
  const [isSolanaConnected, setIsSolanaConnected] = useState(false);
  const [isOktoConnected, setIsOktoConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [portfolioInfo, setPortfolioInfo] = useState<PortfolioInfo | null>(null);
  const [notification, setNotification] = useState({ message: '', status: '', show: false });
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { getWallets, createWallet, getPortfolio } = useOkto() as OktoContextType;

  const showNotification = useCallback((message: string, status: string) => {
    setNotification({ message, status, show: true });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 3000);
  }, []);

  const fetchOktoWalletInfo = useCallback(async () => {
    try {
      const wallets = await getWallets();
      const firstWallet = wallets?.wallets?.[0] || null;

      if (firstWallet) {
        const { address, network_name: networkName } = firstWallet;
        setWalletInfo({ address, networkName });
        setIsOktoConnected(true);
        await saveDataToAsyncStorage('walletAddress', address);
        fetchPortfolioInfo();
      } else {
        setWalletInfo({ address: '', networkName: '' });
        setIsOktoConnected(false);
        await saveDataToAsyncStorage('walletAddress', '');
      }
    } catch (error) {
      console.error('Error fetching Okto wallet info:', error);
      setWalletInfo({ address: '', networkName: '' });
      setIsOktoConnected(false);
      await saveDataToAsyncStorage('walletAddress', '');
      showNotification('Failed to fetch wallet info', 'error');
    }
  }, [getWallets, showNotification, saveDataToAsyncStorage]);

  const fetchPortfolioInfo = useCallback(async () => {
    try {
      const portfolio: any = await getPortfolio();
      if (portfolio) {
        if (Array.isArray(portfolio.tokens) && portfolio.tokens.length > 0) {
          const firstToken = portfolio.tokens[0];
          setPortfolioInfo({
            tokens: [
              {
                name: firstToken.token_name || 'Unknown',
                quantity: firstToken.quantity || '0',
                networkName: firstToken.network_name || 'Unknown Network',
              },
            ],
            amount: portfolio.total || 0,
          });
        } else {
          // Handle the case where there are no tokens
          setPortfolioInfo({
            tokens: [],
            amount: 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching portfolio info:', error);
      showNotification('Failed to fetch portfolio info', 'error');
    }
  }, [getPortfolio, showNotification]);

  useEffect(() => {
    fetchOktoWalletInfo();
  }, [fetchOktoWalletInfo]);

  const handleSolanaConnect = async () => {
    const result = await connectWallet();
    if (result) {
      setIsSolanaConnected(true);
      showNotification('Solana wallet connected', 'success');
    }
  };

  const handleSolanaDisconnect = async () => {
    await disconnectWallet();
    setIsSolanaConnected(false);
    showNotification('Solana wallet disconnected', 'success');
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    showNotification('Copied to clipboard', 'success');
  };

  const toggleModal = () => setIsModalVisible(!isModalVisible);

  return (
    <>
      <Stack.Screen options={{ title: 'Earnings', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/screens/profile')}>
            <Image source={require('../../../assets/previous.png')} resizeMode="contain" />
          </TouchableOpacity>

          <View style={styles.topContainer}>
            {!isSolanaConnected ? (
              <TouchableOpacity style={styles.button} onPress={handleSolanaConnect}>
                <Text style={styles.buttonText}>Connect Solana Wallet</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleSolanaDisconnect}>
                <Text style={styles.buttonText}>Disconnect Solana Wallet</Text>
              </TouchableOpacity>
            )}

            <View style={styles.walletInfoHeader}>
              <View style={styles.tierContainer}>
                <View style={styles.tierCircle}>
                  <Text style={styles.tierNumber}>0</Text>
                </View>
              </View>
              <TouchableOpacity onPress={toggleModal} style={styles.infoButton}>
                <Ionicons name="information-circle" size={20} color="#B71C1C" />
              </TouchableOpacity>
            </View>

            <View style={styles.earningsContainer}>
              <View style={styles.display}>
                <Text style={styles.displayText}>Your Earning</Text>
                <View style={styles.earningValueContainer}>
                  <Image source={require('../../../assets/coin.png')} resizeMode="contain" />
                  <Text style={styles.earning}>0</Text>
                </View>
              </View>

              <View style={styles.display}>
                <Text style={styles.displayText}>Today's Earning</Text>
                <View style={styles.earningValueContainer}>
                  <Image source={require('../../../assets/coin.png')} resizeMode="contain" />
                  <Text style={styles.earning}>0</Text>
                </View>
              </View>
            </View>
          </View>

          {isOktoConnected && walletInfo && (
            <View style={styles.walletInfoContainer}>
              <Text style={styles.walletInfoTitle}>Okto Wallet</Text>

              <View style={styles.walletAddressCard}>
                <Ionicons name="wallet-outline" size={18} color="#B71C1C" style={styles.icon} />
                <Text style={styles.walletAddressText}>
                  {`${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(walletInfo.address.length - 4)}`}
                </Text>
                <TouchableOpacity onPress={() => copyToClipboard(walletInfo.address)}>
                  <Ionicons name="copy-outline" size={18} color="#B71C1C" />
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="globe-outline" size={18} color="#B71C1C" style={styles.icon} />
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      width: '87%',
                    }}>
                    <Text style={styles.infoLabel}>Network</Text>
                    <Text style={styles.infoValue}>{walletInfo.networkName}</Text>
                  </View>
                </View>
              </View>

              {portfolioInfo && (
                <View style={styles.portfolioCard}>
                  <Text style={styles.portfolioTitle}>Portfolio Summary</Text>
                  <View style={styles.portfolioInfo}>
                    <View style={styles.portfolioItem}>
                      <Ionicons name="cash-outline" size={24} color="#B71C1C" style={styles.icon} />
                      <View>
                        <Text style={styles.infoLabel}>Tokens</Text>
                        <Text style={styles.infoValue}>{portfolioInfo.tokens[0]?.name}</Text>
                      </View>
                    </View>
                    <View style={styles.portfolioItem}>
                      <Ionicons name="apps-outline" size={24} color="#B71C1C" style={styles.icon} />
                      <View>
                        <Text style={styles.infoLabel}>Amount</Text>
                        <Text style={styles.infoValue}>{portfolioInfo.tokens[0]?.quantity}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.listItems}>
            <TouchableOpacity style={styles.listItem}>
              <Image source={require('../../../assets/history.png')} />
              <Text style={styles.listItemText}>Transaction History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.listItem}>
              <Image source={require('../../../assets/add-user.png')} />
              <Text style={styles.listItemText}>Referrals</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={toggleModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Create Embedded Wallet With Okto</Text>
              <Text style={styles.modalText}>
                Alert!: Wallet is in Devnet. Do not send real funds
              </Text>
              <TouchableOpacity onPress={toggleModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {notification.show && (
          <Notification
            status={notification.status}
            message={notification.message}
            switchShowOff={() => setNotification((prev) => ({ ...prev, show: false }))}
          />
        )}
      </SafeAreaView>
    </>
  );
}

export default EarningsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  topContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#B71C1C',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    position: 'absolute',
    top: -18,
    right: 68,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  walletInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tierContainer: {
    alignItems: 'center',
  },
  tierCircle: {
    width: 32,
    height: 32,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#B71C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  infoButton: {
    padding: 5,
  },
  earningsContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  display: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  displayText: {
    fontSize: 12,
    marginBottom: 5,
  },
  earningValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earning: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  walletInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  walletInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  walletInfoText: {
    fontSize: 14,
    marginBottom: 5,
  },
  listItems: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemText: {
    marginLeft: 15,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#B71C1C',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  walletAddressCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  connectedAddressCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  walletAddressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  portfolioCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
  },
  portfolioTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  portfolioInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  portfolioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
