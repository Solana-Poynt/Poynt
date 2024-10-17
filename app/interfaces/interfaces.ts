export type RootStackParamList = {
  Home: undefined;
  Onboard: undefined;
  Login: undefined;
  Signup: undefined;
  Recover: undefined;
  Otp: undefined;
  Reset: undefined;
};

export interface IButton {
  title?: string;
  color?: string;
  image?: string;
  handleClick?: () => {};
  link?:
    | '/details'
    | '/(app)/screens/home'
    | '/(app)/screens/navigate'
    | '/screens/signup'
    | '/screens/web3'
    | '/screens/otp'
    | '/screens/recover'
    | '/screens/reset'
    | '/details'
    | '/screens/home'
    | '/screens/signup'
    | '/screens/otp'
    | '/screens/recover'
    | '/screens/reset'
    | '/'
    | '/_sitemap'
    | '/interfaces/interfaces'
    | '/screens/login';
}

export interface IUserResponse extends IUser {
  data: IUser;
  message: string;
  success: boolean;
}
export interface IUser extends ILocation {
  _id?: string;
  password?: string;
  email: string;
  name?: string;
  referralId?: string;
  referrals?: number;
  savedLocations?: ILocation[];
  recentSearchs?: string[];
  poynts?: number;
  tier?: number;
  role?: string;
  googleId?: string;
  OTP?: number | string;
  otpExpiresAt?: number;
  isEmailVerified?: boolean;
  createdAt?: string;
}

export interface ILocation {
  locationName?: string;
  meridian?: string;
}
