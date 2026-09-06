const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Memory & Performance Optimizations
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512'); // Limit V8 heap

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#38bdf8',
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true,
      contextIsolation: false,
      webauthn: true
    },
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  
  autoUpdater.checkForUpdatesAndNotify();
  
  ipcMain.on('check-for-updates', (event) => {
    event.reply('update-status', 'Checking for updates...');
    autoUpdater.checkForUpdates();
  });

  autoUpdater.on('update-available', () => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'Update available. Downloading...');
  });

  autoUpdater.on('update-not-available', () => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'You are on the latest version.');
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'Error: ' + err.message);
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'Update downloaded. Restarting...');
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 2000);
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
