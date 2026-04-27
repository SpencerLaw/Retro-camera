const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray;
// Set to autostart room page url
const TARGET_URL = 'https://lovedare.baby/broadcast/receiver?autostart=1';

app.setName('班级广播接收器');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    show: true, // We show it immediately, teachers can minimize it
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // CRITICAL: prevents throttling when minimized!
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(TARGET_URL).catch((error) => {
    console.error('Failed to load receiver page:', error);
  });

  // Instead of quitting when X is pressed, minimize to tray
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Using a sample icon, might fail if icon.ico is not present. 
  // For safety, let's allow it to fail gracefully or use a native image if needed.
  try {
    tray = new Tray(path.join(__dirname, 'icon.ico'));
  } catch (e) {
    try {
      tray = new Tray(path.join(__dirname, 'icon.png'));
    } catch (fallbackError) {
      console.warn('Tray disabled because no valid icon was found:', fallbackError);
      return;
    }
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开播报窗口', click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: '完全退出', click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('班级广播接收器');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// Ensure autostart setting is correctly applied on boot
function setupAutoStart() {
  const exeName = path.basename(process.execPath);
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
    args: [
      '--hidden'
    ]
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupAutoStart();

  // If started from startup with --hidden
  if (process.argv.includes('--hidden')) {
    mainWindow.hide();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// === IPC LISTENERS FOR REACT FRONTEND ===
ipcMain.on('show-window', (event, isEmergency) => {
  if (mainWindow) {
    // Show window if it was hidden
    if (!mainWindow.isVisible()) {
      mainWindow.showInactive();
    }
    // Restore if minimized
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    // Bring to front
    // Windows requires setting alwaysOnTop then removing it to force foreground
    mainWindow.setAlwaysOnTop(true, "screen-saver");
    mainWindow.focus();
    
    // If it's an emergency, maybe keep it on top for 5 seconds
    if (isEmergency) {
      setTimeout(() => {
        mainWindow.setAlwaysOnTop(false);
      }, 5000);
    } else {
      mainWindow.setAlwaysOnTop(false);
    }
  }
});
