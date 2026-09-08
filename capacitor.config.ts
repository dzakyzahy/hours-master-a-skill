import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hoursmaster.app',
  appName: 'Skillo',
  webDir: 'dist',
  server: {
    url: 'http://10.21.105.19:5173',
    cleartext: true
  }
};

export default config;
