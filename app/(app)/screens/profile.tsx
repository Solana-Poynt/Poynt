import { Platform, StatusBar, StyleSheet, View, Image, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGetUserQuery } from '../../../store/api/api';
import { IUser } from '~/app/interfaces/interfaces';
import { useDispatch } from 'react-redux';
import { logOut } from '~/store/slices/isAuthSlice';
import { AppDispatch } from '~/store/store';

function ProfileScreen() {
  const router = useRouter();

  const dispatch = useDispatch<AppDispatch>();
  async function logout() {
    try {
      // Clear auth state in Redux
      dispatch(logOut());

      // Redirect to login screen
      router.push({ pathname: '/screens/login' });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  //MAKE CALL TO BACKEND TO FTECH USER DATA
  const { data: userData, isLoading: userIsLoading, error: userError } = useGetUserQuery();
  const user: IUser | undefined = userData && userData?.data;

  const listItems: any = [
    {
      name: 'My Places',
      path: '',
    },
    {
      name: 'Change Email',
      path: '',
    },
    {
      name: 'Change Password',
      path: '',
    },
    {
      name: 'Enable Notifications',
      path: '',
    },
    {
      name: 'Incognito Mode',
      path: '',
    },
    {
      name: 'Logout',
      path: '',
    },
  ];

  const getIcon = (image: string) => {
    return image === 'My Places'
      ? require('../../../assets/star.png')
      : image === 'Change Email'
        ? require('../../../assets/email.png')
        : image === 'Change Password'
          ? require('../../../assets/lock.png')
          : image === 'Enable Notifications'
            ? require('../../../assets/bell.png')
            : image === 'Incognito Mode'
              ? require('../../../assets/incognito.png')
              : image === 'Logout'
                ? require('../../../assets/previous.png')
              : '';
  };

  const getActionIcon = (image: string) => {
    return image === 'My Places'
      ? require('../../../assets/next.png')
      : image === 'Change Email'
        ? require('../../../assets/next.png')
        : image === 'Change Password'
          ? require('../../../assets/next.png')
          : image === 'Enable Notifications'
            ? require('../../../assets/switch.png')
            : image === 'Incognito Mode'
              ? require('../../../assets/switch.png')
              : '';
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Profile', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.profileCard}>
          <View style={styles.imageContainer}>
            <Image
              style={styles.userImage}
              source={require('../../../assets/vatar.png')}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.userName}>{user?.name && user?.name}</Text>
          <View style={styles.cardBottom}>
            <View style={styles.cardBottomInner}>
              <Image source={require('../../../assets/tier.png')} />
              <Text style={styles.cardBottomInnerText}>Tier 1</Text>
            </View>
            <View style={[styles.cardBottomInner, styles.withBg]}>
              <Image source={require('../../../assets/premuim.png')} />
              <Text style={[styles.cardBottomInnerText, { color: '#939393' }]}>Go Premium</Text>
            </View>
          </View>
        </View>

        <View style={styles.subTabs}>
          <Text style={[styles.tabText, styles.textWithBg]}>My Profile</Text>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/screens/earnings')}>
            <Text style={[styles.tabText]}>My Earnings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listItemsContainer}>
          {listItems.map((item: any) => (
            <TouchableOpacity
              key={item.name}
              onPress={item.name === 'Logout' ? logout : () => {}}
              style={styles.listItem}>
              <Image source={getIcon(item.name)} />
              <Text style={styles.listItemText}>{item.name}</Text>
              <Image source={getActionIcon(item.name)} />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </>
  );
}

export default ProfileScreen;

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
  profileCard: {
    width: '100%',
    padding: 48,
    backgroundColor: '#B71C1C',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    position: 'relative',
  },
  imageContainer: {
    width: 104,
    height: 104,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  userImage: {
    width: 150,
    height: 150,
    borderRadius: 104 / 2,
  },
  userName: {
    fontFamily: 'Inter-VariableFont',
    color: '#FAFAFA',
    fontSize: 24,
    fontStyle: 'normal',
    lineHeight: 32,
    fontWeight: '700',
  },
  imageIcon: {
    position: 'absolute',
    bottom: -8,
    right: -8,
  },
  cardBottom: {
    position: 'absolute',
    bottom: -18,
    width: '100%',
    height: 46,
    borderRadius: 100,
    backgroundColor: '#ffffff',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  cardBottomInner: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  withBg: {
    backgroundColor: '#F8E8E8',
    color: '#939393',
    borderRadius: 100,
  },
  cardBottomInnerText: {
    color: '#000000',
    fontSize: 12,
    fontStyle: 'normal',
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: 'Inter-VariableFont',
  },
  subTabs: {
    marginTop: 37,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8E8E8',
    borderRadius: 16,
  },
  tabText: {
    flex: 1,
    height: '100%',
    padding: 10,
    textAlign: 'center',
    color: '#939393',
    fontSize: 16,
    fontStyle: 'normal',
    lineHeight: 24,
    fontWeight: '500',
    borderRadius: 16,
    fontFamily: 'Inter-VariableFont',
  },
  textWithBg: {
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  listItemsContainer: {
    marginTop: 12,
    width: '100%',
  },
  listItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomColor: '#E4E4E4',
    borderBottomWidth: 1,
  },
  listItemText: {
    fontFamily: 'Inter-VariableFont',
    flex: 2,
    textAlign: 'left',
    color: '#000000',
    fontSize: 16,
    fontStyle: 'normal',
    lineHeight: 24,
    fontWeight: '400',
  },
});
