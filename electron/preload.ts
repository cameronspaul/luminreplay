import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('electronAPI', {
  getMonitors: () => ipcRenderer.invoke('get-monitors'),
  selectMonitor: (index: number | 'all') => ipcRenderer.invoke('select-monitor', index),

  // Settings API
  getSettings: () => ipcRenderer.invoke('settings-get-all'),
  getSetting: (key: string) => ipcRenderer.invoke('settings-get', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('settings-set', key, value),
  setSettings: (settings: Record<string, any>) => ipcRenderer.invoke('settings-set-multiple', settings),
  resetSettings: () => ipcRenderer.invoke('settings-reset'),
  pickFolder: () => ipcRenderer.invoke('settings-pick-folder'),

  // Restart OBS with new settings
  restartOBS: () => ipcRenderer.invoke('obs-restart'),
})
