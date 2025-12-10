import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, shell } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { OBSManager } from './obs'
import SettingsManager from './settings'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let tray: Tray | null = null
let lastReplayPath: string | null = null
let isQuitting = false

function createWindow() {
  // Remove the application menu bar
  Menu.setApplicationMenu(null)

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 450,
    height: 670,
    resizable: false,
    show: false, // Start hidden
    autoHideMenuBar: true, // Hide the menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Hide window instead of closing when X is clicked
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win?.hide()
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function createTray() {
  // Create tray icon - use PNG for Windows compatibility
  const iconPath = path.join(process.env.VITE_PUBLIC, 'tray-icon.png')

  let trayIcon: nativeImage
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    // Resize for tray (16x16 on Windows)
    if (!trayIcon.isEmpty()) {
      trayIcon = trayIcon.resize({ width: 16, height: 16 })
    }
  } catch {
    // Fallback: create an empty icon if file not found
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('LuminReplay - Recording')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'LuminReplay',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Replay Buffer Active',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Save Replay (Alt+F10)',
      click: async () => {
        try {
          lastReplayPath = await OBSManager.getInstance().saveReplayBuffer() as string
          showOverlay()
        } catch (err) {
          console.error('Failed to save replay:', err)
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (win) {
          win.show()
          win.focus()
        }
      },
    },
    {
      label: 'Open Recordings Folder',
      click: () => {
        const settings = SettingsManager.getInstance().getAllSettings()
        shell.openPath(settings.recordingPath)
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // Single-click to show settings
  tray.on('click', () => {
    if (win) {
      win.show()
      win.focus()
    }
  })

  // Double-click also shows settings (for consistency)
  tray.on('double-click', () => {
    if (win) {
      win.show()
      win.focus()
    }
  })
}

function showOverlay() {
  if (overlayWindow) {
    overlayWindow.focus()
    return
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
  })

  if (VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(`${VITE_DEV_SERVER_URL}?overlay=true`)
  } else {
    overlayWindow.loadURL(`file://${path.join(RENDERER_DIST, 'index.html')}?overlay=true`)
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

app.on('window-all-closed', () => {
  // Don't quit on window close - we're a tray app
  // Only quit when explicitly requested
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

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, show our window
    if (win) {
      win.show()
      win.focus()
    }
  })
}

app.whenReady().then(() => {
  // Initialize Settings first (so IPC handlers are ready)
  SettingsManager.getInstance()

  // Create the main window (hidden)
  createWindow()

  // Create tray icon
  createTray()

  // Initialize OBS
  OBSManager.getInstance().initialize()

  // Register Hotkey
  const ret = globalShortcut.register('Alt+F10', async () => {
    console.log('Alt+F10 is pressed')

    try {
      // Trigger Save
      lastReplayPath = await OBSManager.getInstance().saveReplayBuffer() as string
      showOverlay()
    } catch (err) {
      console.error('Failed to save replay:', err)
    }
  })

  // IPC Handlers
  ipcMain.handle('get-monitors', () => {
    return OBSManager.getInstance().getMonitors()
  })

  ipcMain.handle('select-monitor', async (_event, index) => {
    if (!lastReplayPath) return
    console.log('Selected monitor:', index)

    try {
      const result = await OBSManager.getInstance().processReplay(lastReplayPath, index)
      console.log('Replay processed to:', result)
    } catch (e) {
      console.error(e)
    }

    if (overlayWindow) overlayWindow.close()
  })

  if (!ret) {
    console.log('Hotkey registration failed')
  } else {
    console.log('Hotkey Alt+F10 registered successfully')
  }

  console.log('LuminReplay is running in the system tray')
})
