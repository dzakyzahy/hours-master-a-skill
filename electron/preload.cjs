const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, value) => callback(value))
});

window.addEventListener('DOMContentLoaded', () => {
    // Custom preload logic can go here
});
