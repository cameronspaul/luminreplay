/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  electronAPI: {
    getMonitors: () => Promise<any[]>
    selectMonitor: (index: number | 'all') => Promise<void>

    // Settings API
    getSettings: () => Promise<any>
    getSetting: (key: string) => Promise<any>
    setSetting: (key: string, value: any) => Promise<any>
    setSettings: (settings: Record<string, any>) => Promise<any>
    resetSettings: () => Promise<any>
    pickFolder: () => Promise<string | null>
    restartOBS: () => Promise<{ success: boolean }>
  }
}

