import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, shell, screen, dialog } from 'electron'
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

// --- Debug Console Implementation ---
let debugWindow: BrowserWindow | null = null

const originalLog = console.log
const originalError = console.error
const originalWarn = console.warn

function sendToDebug(type: string, args: any[]) {
  if (debugWindow && !debugWindow.isDestroyed()) {
    const message = args.map(arg => {
      try {
        if (arg instanceof Error) {
          return arg.stack || arg.message
        }
        return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      } catch (e) {
        return String(arg)
      }
    }).join(' ')
    debugWindow.webContents.send('log-message', { type, message })
  }
}

console.log = (...args) => {
  originalLog.apply(console, args)
  sendToDebug('log', args)
}

console.error = (...args) => {
  originalError.apply(console, args)
  sendToDebug('error', args)
}

console.warn = (...args) => {
  originalWarn.apply(console, args)
  sendToDebug('warn', args)
}

function createDebugWindow() {
  debugWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'LuminReplay Debug Console',
    autoHideMenuBar: true,
    backgroundColor: '#1e1e1e',
    icon: path.join(process.env.VITE_PUBLIC, 'lumin.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  const html = `
    <html>
      <head>
        <title>LuminReplay Debug Console</title>
        <style>
          body { background-color: #1e1e1e; color: #d4d4d4; font-family: Consolas, 'Courier New', monospace; padding: 10px; margin: 0; overflow-y: auto; }
          .entry { margin-bottom: 4px; border-bottom: 1px solid #333; padding-bottom: 2px; white-space: pre-wrap; word-wrap: break-word; }
          .log { color: #d4d4d4; }
          .error { color: #f48771; }
          .warn { color: #cca700; }
          .timestamp { color: #569cd6; margin-right: 8px; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div id="logs"></div>
        <script>
          const { ipcRenderer } = require('electron');
          const logsDiv = document.getElementById('logs');
          
          function addLog(message, type) {
             const div = document.createElement('div');
             div.className = 'entry ' + type;
             
             const time = new Date().toLocaleTimeString();
             const timeSpan = document.createElement('span');
             timeSpan.className = 'timestamp';
             timeSpan.textContent = '[' + time + ']';
             
             const msgSpan = document.createElement('span');
             msgSpan.textContent = message;
             
             div.appendChild(timeSpan);
             div.appendChild(msgSpan);
             
             logsDiv.appendChild(div);
             window.scrollTo(0, document.body.scrollHeight);
          }
          
          ipcRenderer.on('log-message', (event, data) => {
             addLog(data.message, data.type);
          });
        </script>
      </body>
    </html>
  `

  debugWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

  debugWindow.on('closed', () => {
    debugWindow = null
  })
}
// ------------------------------------


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
  const iconPath = path.join(process.env.VITE_PUBLIC, 'luminrecord.png')

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

  // Initialize with active state (matches OBS auto-start)
  updateTrayMenu(true)

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

function showNotification(type: 'recorded' | 'saved' | 'buffer-on' | 'buffer-off') {
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
    backgroundColor: '#00000000', // Ensure fully transparent background
    show: false, // Don't show until ready
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

  // Show only when ready to avoid FOUC
  notificationWindow.once('ready-to-show', () => {
    notificationWindow?.show()
  })

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
      // Show the "Clip Saved" notification immediately
      showNotification('saved')
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

    // Show immediate notification that we're saving (skipping processing state)
    showNotification('saved')

    // Process the replay in the background
    OBSManager.getInstance().processReplay(replayPath, monitorIndex)
      .then((result) => {
        console.log('Replay processed to:', result)
        // No second notification needed
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

// Toggle replay buffer on/off
function toggleReplayBuffer(): boolean {
  const obsManager = OBSManager.getInstance()
  const isRunning = obsManager.isReplayBufferRunning()

  if (isRunning) {
    console.log('Toggling replay buffer OFF')
    obsManager.stopReplayBuffer()
    showNotification('buffer-off')
    updateTrayMenu(false)
    return false
  } else {
    console.log('Toggling replay buffer ON')
    obsManager.startReplayBufferPublic()
    showNotification('buffer-on')
    updateTrayMenu(true)
    return true
  }
}

// Update tray menu to reflect buffer state
function updateTrayMenu(bufferActive: boolean) {
  if (!tray) return

  // Update Icon based on buffer state
  const iconName = bufferActive ? 'luminrecord.png' : 'lumin.png'
  const iconPath = path.join(process.env.VITE_PUBLIC, iconName)

  try {
    let trayIcon = nativeImage.createFromPath(iconPath)
    if (!trayIcon.isEmpty()) {
      // Resize for tray (16x16 on Windows)
      trayIcon = trayIcon.resize({ width: 16, height: 16 })
      tray.setImage(trayIcon)
    }
  } catch (e) {
    console.error(`Failed to update tray icon to ${iconName}:`, e)
  }

  const settings = SettingsManager.getInstance().getAllSettings()
  const toggleHotkey = settings.bufferToggleHotkey || 'Alt+F9'

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'LuminReplay',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: bufferActive ? '● Replay Buffer Active' : '○ Replay Buffer Paused',
      enabled: false,
    },
    {
      label: bufferActive ? `Pause Buffer (${toggleHotkey})` : `Resume Buffer (${toggleHotkey})`,
      click: () => {
        toggleReplayBuffer()
      },
    },
    { type: 'separator' },
    {
      label: 'Save Replay (Alt+F10)',
      enabled: bufferActive,
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
  tray.setToolTip(bufferActive ? 'LuminReplay - Recording' : 'LuminReplay - Paused')
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
  app.setAppUserModelId('com.luminreplay.app')
  app.on('second-instance', () => {
    // Someone tried to run a second instance, show our window
    if (win) {
      win.show()
      win.focus()
    }
  })
}

app.whenReady().then(async () => {
  // Initialize Settings first (so IPC handlers are ready)
  SettingsManager.getInstance()

  // Open Debug Console in production/built app
  if (!VITE_DEV_SERVER_URL) {
    createDebugWindow()
  }

  // Check if OBS is available (checks for missing dependencies like VC++ Redist)
  const obsManager = OBSManager.getInstance()
  if (!obsManager.isOBSAvailable()) {
    const result = await dialog.showMessageBox({
      type: 'error',
      title: 'Missing Dependencies',
      message: 'LuminReplay Video Engine Failed to Load',
      detail: 'The recording engine (OBS) could not be initialized.\n\nThis is usually because the "Visual C++ Redistributable" is missing from your system.\n\nWould you like to support us by installing the required components automatically?',
      buttons: ['Install Dependencies', 'Ignore'],
      defaultId: 0,
      cancelId: 1,
    })

    if (result.response === 0) {
      // Open the download link for VC++ Redistributable x64
      await shell.openExternal('https://aka.ms/vs/17/release/vc_redist.x64.exe')

      // Inform the user to restart
      await dialog.showMessageBox({
        type: 'info',
        title: 'Restart Required',
        message: 'Please Restart LuminReplay',
        detail: 'After installing the redistributable, please restart LuminReplay to enable recording features.',
        buttons: ['OK']
      })
    }
  }

  // Create the main window (hidden)
  createWindow()

  // Create tray icon
  createTray()

  // Initialize OBS
  OBSManager.getInstance().initialize()

  // Show notification that buffer has started
  if (OBSManager.getInstance().isOBSAvailable()) {
    showNotification('buffer-on')
  }

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

    // Buffer toggle hotkey
    if (settings.bufferToggleHotkey) {
      const ret = globalShortcut.register(settings.bufferToggleHotkey, () => {
        console.log(`${settings.bufferToggleHotkey} is pressed - toggling buffer`)
        toggleReplayBuffer()
      })
      if (!ret) {
        console.log(`Hotkey registration failed for Buffer Toggle: ${settings.bufferToggleHotkey}`)
      } else {
        console.log(`Buffer Toggle hotkey ${settings.bufferToggleHotkey} registered successfully`)
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

  // Buffer toggle IPC handlers
  ipcMain.handle('toggle-buffer', () => {
    return toggleReplayBuffer()
  })

  ipcMain.handle('get-buffer-status', () => {
    return OBSManager.getInstance().isReplayBufferRunning()
  })

  ipcMain.handle('select-monitor', async (_event, index) => {
    if (!lastReplayPath) return
    console.log('Selected monitor:', index)

    // Close the overlay immediately for better UX
    if (overlayWindow) overlayWindow.close()

    // Show saved notification immediately
    showNotification('saved')

    // Process the replay in the background
    const replayPath = lastReplayPath
    OBSManager.getInstance().processReplay(replayPath, index)
      .then((result) => {
        console.log('Replay processed to:', result)
        // No second notification needed
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
