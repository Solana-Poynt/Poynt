import { useOkto, type OktoContextType, type Wallet } from 'okto-sdk-react-native';
import React, { useState } from 'react';
import { View, Text } from 'react-native';

const UserProfileScreen = () => {
  const { getWallets } = useOkto() as OktoContextType;
  const [userWallets, setUserWallets] = useState<Wallet[] | any[]>([]);

  React.useEffect(() => {
    getWallets()
      .then((result: any) => {
        setUserWallets(result);
      })
      .catch((error) => {
        console.error(`error:`, error);
      });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Text>User Wallets</Text>
      <View>
        {userWallets.map((wallet, index) => (
          <View key={index} style={{ marginVertical: 10 }}>
            <Text>{wallet.network_name}</Text>
            <Text>{wallet.address}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default UserProfileScreen;
