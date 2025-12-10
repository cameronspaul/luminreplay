import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { OBSManager } from './obs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let overlayWindow: BrowserWindow | null = null;
let lastReplayPath: string | null = null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

// Cleanup OBS and hotkeys on app quit
app.on('will-quit', () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll()

  // Shutdown OBS
  OBSManager.getInstance().shutdown()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()

  // Initialize OBS
  OBSManager.getInstance().initialize()

  // Register Hotkey
  const ret = globalShortcut.register('Alt+F10', async () => {
    console.log('Alt+F10 is pressed')

    // Trigger Save
    lastReplayPath = await OBSManager.getInstance().saveReplayBuffer() as string;

    if (overlayWindow) {
      overlayWindow.focus();
      return;
    }

    overlayWindow = new BrowserWindow({
      width: 800,
      height: 600,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.mjs'),
      }
    });

    if (VITE_DEV_SERVER_URL) {
      overlayWindow.loadURL(`${VITE_DEV_SERVER_URL}?overlay=true`);
    } else {
      overlayWindow.loadURL(`file://${path.join(RENDERER_DIST, 'index.html')}?overlay=true`);
    }

    overlayWindow.on('closed', () => {
      overlayWindow = null;
    });
  })

  // IPC Handlers
  ipcMain.handle('get-monitors', () => {
    return OBSManager.getInstance().getMonitors();
  });

  ipcMain.handle('select-monitor', async (event, index) => {
    if (!lastReplayPath) return;
    console.log('Selected monitor:', index);

    try {
      const result = await OBSManager.getInstance().processReplay(lastReplayPath, index);
      console.log('Replay processed to:', result);
    } catch (e) {
      console.error(e);
    }

    if (overlayWindow) overlayWindow.close();
  });

  if (!ret) {
    console.log('registration failed')
  }
})
