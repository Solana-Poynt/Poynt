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
  link:
    | '/details'
    | '/screens/home'
    | '/screens/signup'
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
