import React from 'react';
import { useOkto, type OktoContextType } from 'okto-sdk-react-native';
import { Button } from 'react-native';

const WalletCreationComponent: React.FC = () => {
  const { createWallet } = useOkto() as OktoContextType;

  const handleCreateWallet = async () => {
    try {
      // Make sure you have the necessary parameters

      const result = await createWallet();
      console.log('Wallet created successfully:', result);
      // Handle successful wallet creation (e.g., update UI, store wallet info)
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server responded with error:', error.response.data);
        console.error('Status code:', error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
      }
    }
  };

  return <Button onPress={handleCreateWallet} title="Created Wallet" />;
};

export default WalletCreationComponent;
