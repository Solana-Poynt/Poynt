import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_IDENTITY = {
  name: 'Ponyt App (Dev)',
  uri: 'http://192.168.0.166:8081',
  // icon field omitted for dev build, or you can use a local asset path if available
};

interface AuthorizationResult {
  auth_token: string;
  accounts: Array<{
    address: string;
    display_address: string;
    display_address_format: string;
    label?: string;
    icon?: string;
    chains: Array<string>;
    features: Array<string>;
  }>;
  wallet_uri_base: string;
  sign_in_result: {
    address: string;
    signed_message: string;
    signature: string;
    signature_type: string;
  };
}

const STORAGE_KEY = 'ponyt_wallet_auth_token';

async function getStoredAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error retrieving stored auth token:', error);
    return null;
  }
}

async function storeAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, token);
  } catch (error) {
    console.error('Error storing auth token:', error);
  }
}

export async function connectWallet(): Promise<AuthorizationResult | null> {
  try {
    const storedAuthToken = await getStoredAuthToken();

    const authorizationResult = await transact(async (wallet: Web3MobileWallet) => {
      console.log('Attempting to authorize wallet...');
      const result = await wallet.authorize({
        identity: APP_IDENTITY,
        auth_token: storedAuthToken || undefined,
      });
      console.log('Authorization result:', result);
      return result as AuthorizationResult;
    });

    if (authorizationResult) {
      await storeAuthToken(authorizationResult.auth_token);
      console.log('Wallet connected');
      return authorizationResult;
    }

    return null;
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('Disconnected from wallet');
  } catch (error) {
    console.error('Error disconnecting from wallet:', error);
  }
}

export async function signAndSendTransaction(transaction: any): Promise<string | null> {
  try {
    const authToken = await getStoredAuthToken();
    if (!authToken) {
      throw new Error('Not connected to a wallet');
    }

    const signedTransaction = await transact(async (wallet: Web3MobileWallet) => {
      const result = await wallet.signAndSendTransactions({
        transactions: [transaction],
      });
      return result[0];
    });

    console.log('Transaction sent:', signedTransaction);
    return signedTransaction;
  } catch (error) {
    console.error('Error signing and sending transaction:', error);
    return null;
  }
}
