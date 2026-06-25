import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kg.easygo.app',
  appName: 'EasyGo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'Default',
      backgroundColor: '#ffffff',
    },
    Keyboard: {
      resize: 'body',
      style: 'Dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
