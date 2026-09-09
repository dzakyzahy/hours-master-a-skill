import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
// For electron we would use ipcRenderer

export const initUpdater = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      CapacitorUpdater.notifyAppReady();
      const result = await CapacitorUpdater.download({
        url: 'https://example.com/api/update', // Dummy URL, requires proper capgo config
        version: '1.2.0',
      });
      if (result) {
        // Show prompt: "Install pembaruan?"
        const wantsUpdate = window.confirm("Install pembaruan yang baru saja diunduh?");
        if (wantsUpdate) {
          await CapacitorUpdater.set(result);
        }
      }
    } catch (e) {
      console.log('No update available or updater error', e);
    }
  } else if ((window as any).process && (window as any).process.type) {
    // Electron environment
    // Assume ipcRenderer sends 'update-downloaded'
    // window.require('electron').ipcRenderer.on('update-downloaded', () => {
    //   if (window.confirm("Install pembaruan desktop?")) {
    //     window.require('electron').ipcRenderer.send('install-update');
    //   }
    // });
  }
};
