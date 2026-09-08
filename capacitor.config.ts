import type { CapacitorConfig } from '@capacitor/cli';

const isLiveReload = process.env.CAPACITOR_LIVE_RELOAD === 'true';

const config: CapacitorConfig = {
  appId: 'com.hoursmaster.app',
  appName: 'Skillo',
  webDir: 'dist',
  ...(isLiveReload ? {
    server: {
      url: process.env.LIVE_RELOAD_URL || 'http://10.21.105.107:5173',
      cleartext: true
    }
  } : {})
};

export default config;
