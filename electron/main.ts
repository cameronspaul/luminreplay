import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, shell, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { OBSManager } from './obs'
import SettingsManager from './settings'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let notificationWindow: BrowserWindow | null = null
let tray: Tray | null = null
let lastReplayPath: string | null = null
let isQuitting = false

function createWindow() {
  // Remove the application menu bar
  Menu.setApplicationMenu(null)

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'lumin.ico'),
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
  const iconPath = path.join(process.env.VITE_PUBLIC, 'lumin.png')

  let trayIcon
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
        await performReplaySave()
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
    width: 450,
    height: 670,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
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

function showNotification(type: 'recorded' | 'saved') {
  // Close existing notification if any
  if (notificationWindow) {
    notificationWindow.close()
    notificationWindow = null
  }

  // Get the primary display to position the notification
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  const notificationWidth = 280
  const notificationHeight = 100
  const margin = 16

  notificationWindow = new BrowserWindow({
    width: notificationWidth,
    height: notificationHeight,
    x: screenWidth - notificationWidth - margin,
    y: margin,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    }
  })

  // Prevent the notification from being focused
  notificationWindow.setAlwaysOnTop(true, 'screen-saver')

  if (VITE_DEV_SERVER_URL) {
    notificationWindow.loadURL(`${VITE_DEV_SERVER_URL}?notification=${type}`)
  } else {
    notificationWindow.loadURL(`file://${path.join(RENDERER_DIST, 'index.html')}?notification=${type}`)
  }

  notificationWindow.on('closed', () => {
    notificationWindow = null
  })

  // Auto-close after 3.5 seconds (matches CSS animation)
  setTimeout(() => {
    if (notificationWindow) {
      notificationWindow.close()
    }
  }, 3500)
}

async function performReplaySave() {
  try {
    lastReplayPath = await OBSManager.getInstance().saveReplayBuffer() as string

    const monitors = OBSManager.getInstance().getMonitors()
    const settings = SettingsManager.getInstance().getAllSettings()

    const activeMonitors = monitors.filter(m => {
      if (!settings.enabledMonitors) return true
      return settings.enabledMonitors.includes(m.index)
    })

    if (activeMonitors.length === 1) {
      // Single monitor - no processing needed, original file is already correct
      console.log("Single monitor detected/enabled. Replay saved directly (no processing needed).")
      // Show the "Clip Recorded" notification for single monitor
      showNotification('recorded')
      return true
    } else {
      showOverlay()
      return true
    }
  } catch (err) {
    console.error('Failed to save replay:', err)
    return false
  }
}

// Direct monitor save - bypasses the overlay and saves to a specific monitor directly
async function performDirectMonitorSave(monitorIndex: number | 'all') {
  try {
    const replayPath = await OBSManager.getInstance().saveReplayBuffer() as string

    console.log(`Direct save triggered for monitor: ${monitorIndex}`)

    // Show immediate notification that we're processing
    showNotification('recorded')

    // Process the replay in the background
    OBSManager.getInstance().processReplay(replayPath, monitorIndex)
      .then((result) => {
        console.log('Replay processed to:', result)
        // Show "Clip Saved" notification after processing completes
        showNotification('saved')
      })
      .catch((e) => {
        console.error('Error processing replay:', e)
      })

    return true
  } catch (err) {
    console.error('Failed to save replay for direct monitor save:', err)
    return false
  }
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

  // Function to register all hotkeys
  const registerGlobalHotkeys = () => {
    // Unregister all first to be safe
    globalShortcut.unregisterAll()

    const settings = SettingsManager.getInstance().getAllSettings()

    // Main replay hotkey (shows overlay for multi-monitor)
    const mainHotkey = settings.replayHotkey || 'Alt+F10'
    const mainRet = globalShortcut.register(mainHotkey, async () => {
      console.log(`${mainHotkey} is pressed - showing overlay`)
      await performReplaySave()
    })
    if (!mainRet) {
      console.log(`Hotkey registration failed for main hotkey: ${mainHotkey}`)
    } else {
      console.log(`Main hotkey ${mainHotkey} registered successfully`)
    }

    // Monitor 1 direct save hotkey
    if (settings.monitor1Hotkey) {
      const ret = globalShortcut.register(settings.monitor1Hotkey, async () => {
        console.log(`${settings.monitor1Hotkey} is pressed - direct save Monitor 1`)
        await performDirectMonitorSave(0)
      })
      if (!ret) {
        console.log(`Hotkey registration failed for Monitor 1: ${settings.monitor1Hotkey}`)
      } else {
        console.log(`Monitor 1 hotkey ${settings.monitor1Hotkey} registered successfully`)
      }
    }

    // Monitor 2 direct save hotkey
    if (settings.monitor2Hotkey) {
      const ret = globalShortcut.register(settings.monitor2Hotkey, async () => {
        console.log(`${settings.monitor2Hotkey} is pressed - direct save Monitor 2`)
        await performDirectMonitorSave(1)
      })
      if (!ret) {
        console.log(`Hotkey registration failed for Monitor 2: ${settings.monitor2Hotkey}`)
      } else {
        console.log(`Monitor 2 hotkey ${settings.monitor2Hotkey} registered successfully`)
      }
    }

    // All monitors direct save hotkey
    if (settings.allMonitorsHotkey) {
      const ret = globalShortcut.register(settings.allMonitorsHotkey, async () => {
        console.log(`${settings.allMonitorsHotkey} is pressed - direct save All Monitors`)
        await performDirectMonitorSave('all')
      })
      if (!ret) {
        console.log(`Hotkey registration failed for All Monitors: ${settings.allMonitorsHotkey}`)
      } else {
        console.log(`All Monitors hotkey ${settings.allMonitorsHotkey} registered successfully`)
      }
    }
  }

  // Register initially
  registerGlobalHotkeys()

  // IPC Handler to update hotkeys
  ipcMain.handle('update-hotkey', () => {
    registerGlobalHotkeys()
    return true
  })

  // IPC Handlers
  ipcMain.handle('get-monitors', () => {
    return OBSManager.getInstance().getMonitors()
  })

  ipcMain.handle('save-replay', async () => {
    return await performReplaySave()
  })

  ipcMain.handle('select-monitor', async (_event, index) => {
    if (!lastReplayPath) return
    console.log('Selected monitor:', index)

    // Close the overlay immediately for better UX
    if (overlayWindow) overlayWindow.close()

    // Process the replay in the background
    const replayPath = lastReplayPath
    OBSManager.getInstance().processReplay(replayPath, index)
      .then((result) => {
        console.log('Replay processed to:', result)
        // Show "Clip Saved" notification after processing completes
        showNotification('saved')
      })
      .catch((e) => {
        console.error('Error processing replay:', e)
      })
  })

  ipcMain.handle('cancel-save', async () => {
    console.log('Cancel save requested')

    // Close overlay first
    if (overlayWindow) {
      overlayWindow.close()
      // overlayWindow = null // close() triggers the 'closed' event which sets it to null
    }

    // Delete the temporary file
    if (lastReplayPath) {
      try {
        if (fs.existsSync(lastReplayPath)) {
          await fs.promises.unlink(lastReplayPath)
          console.log('Deleted temporary replay file:', lastReplayPath)
        }
      } catch (e) {
        console.error('Error deleting temporary replay file:', e)
      }
      lastReplayPath = null
    }
  })


  console.log('LuminReplay is running in the system tray')
})
