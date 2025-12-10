import { app, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

// Default settings for LuminReplay
export interface AppSettings {
    // Replay Buffer Settings
    replayBufferDuration: number;  // seconds (e.g., 30, 60, 120)
    replayBufferMaxSize: number;   // MB (e.g., 512, 1024, 2048)

    // Video Quality Settings
    videoBitrate: number;          // kbps (e.g., 6000, 12000, 30000)
    fps: number;                   // frames per second (30, 60, 120)

    // Output Settings
    recordingFormat: 'mp4' | 'mkv' | 'flv';
    recordingPath: string;

    // Audio Settings
    captureDesktopAudio: boolean;
    captureMicrophone: boolean;

    // Hotkey
    replayHotkey: string;
}

const defaultSettings: AppSettings = {
    replayBufferDuration: 30,
    replayBufferMaxSize: 512,
    videoBitrate: 12000,
    fps: 60,
    recordingFormat: 'mp4',
    recordingPath: '',  // Will be set on first run
    captureDesktopAudio: true,
    captureMicrophone: true,
    replayHotkey: 'Alt+F10',
};

class SettingsManager {
    private static instance: SettingsManager;
    private settings: AppSettings;
    private settingsPath: string;

    private constructor() {
        // Store settings in userData directory
        const userDataPath = app.getPath('userData');
        this.settingsPath = path.join(userDataPath, 'luminreplay-settings.json');

        // Load existing settings or use defaults
        this.settings = this.loadSettings();

        // Set default recording path if not set
        if (!this.settings.recordingPath) {
            const videosPath = app.getPath('videos');
            this.settings.recordingPath = path.join(videosPath, 'LuminReplay');
            this.saveSettings();
        }

        this.initIPC();
    }

    private loadSettings(): AppSettings {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const data = fs.readFileSync(this.settingsPath, 'utf-8');
                const loaded = JSON.parse(data);
                // Merge with defaults to ensure all keys exist
                return { ...defaultSettings, ...loaded };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
        return { ...defaultSettings };
    }

    private saveSettings(): void {
        try {
            const dir = path.dirname(this.settingsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    public static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    private initIPC() {
        // Get all settings
        ipcMain.handle('settings-get-all', () => {
            return this.getAllSettings();
        });

        // Get a specific setting
        ipcMain.handle('settings-get', (_, key: keyof AppSettings) => {
            return this.getSetting(key);
        });

        // Set a specific setting
        ipcMain.handle('settings-set', (_, key: keyof AppSettings, value: any) => {
            return this.setSetting(key, value);
        });

        // Set multiple settings at once
        ipcMain.handle('settings-set-multiple', (_, settings: Partial<AppSettings>) => {
            return this.setMultipleSettings(settings);
        });

        // Reset to defaults
        ipcMain.handle('settings-reset', () => {
            return this.resetToDefaults();
        });

        // Open folder picker for recording path
        ipcMain.handle('settings-pick-folder', async () => {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: 'Select Recording Folder',
            });
            if (!result.canceled && result.filePaths.length > 0) {
                this.setSetting('recordingPath', result.filePaths[0]);
                return result.filePaths[0];
            }
            return null;
        });
    }

    public getAllSettings(): AppSettings {
        return { ...this.settings };
    }

    public getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
        return this.settings[key];
    }

    public setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings {
        this.settings[key] = value;
        this.saveSettings();
        return { ...this.settings };
    }

    public setMultipleSettings(settings: Partial<AppSettings>): AppSettings {
        for (const [key, value] of Object.entries(settings)) {
            if (key in defaultSettings) {
                (this.settings as any)[key] = value;
            }
        }
        this.saveSettings();
        return { ...this.settings };
    }

    public resetToDefaults(): AppSettings {
        // Keep the recording path
        const currentPath = this.settings.recordingPath;
        this.settings = { ...defaultSettings, recordingPath: currentPath };
        this.saveSettings();
        return { ...this.settings };
    }
}

export default SettingsManager;
