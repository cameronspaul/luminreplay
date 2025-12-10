"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getMonitors: () => electron.ipcRenderer.invoke("get-monitors"),
  selectMonitor: (index) => electron.ipcRenderer.invoke("select-monitor", index),
  // Settings API
  getSettings: () => electron.ipcRenderer.invoke("settings-get-all"),
  getSetting: (key) => electron.ipcRenderer.invoke("settings-get", key),
  setSetting: (key, value) => electron.ipcRenderer.invoke("settings-set", key, value),
  setSettings: (settings) => electron.ipcRenderer.invoke("settings-set-multiple", settings),
  resetSettings: () => electron.ipcRenderer.invoke("settings-reset"),
  pickFolder: () => electron.ipcRenderer.invoke("settings-pick-folder"),
  // Restart OBS with new settings
  restartOBS: () => electron.ipcRenderer.invoke("obs-restart"),
  // Update hotkeys
  updateHotkey: () => electron.ipcRenderer.invoke("update-hotkey")
});
