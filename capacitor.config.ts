import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.normie.observer',
  appName: 'Normie Observer',
  webDir: 'dist/public',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#0a0a0a',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#AA3D1D',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },
  },
  server: {
    hostname: 'normie.observer',
    androidScheme: 'https',
    iosScheme: 'https',
  },
};

export default config;
