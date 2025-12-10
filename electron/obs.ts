import { app, screen, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import SettingsManager from './settings';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make __dirname available globally for libraries that expect it (like fluent-ffmpeg)
(globalThis as any).__dirname = __dirname;
(globalThis as any).__filename = __filename;

// obs-studio-node is a native module. 
// We use require because strict ESM import might fail with native addons in some setups,
// but let's try standard import or use createRequire if needed.
// For now, assuming it works or we use a workaround.
let obs: any;

try {
    obs = require('obs-studio-node');
} catch (e) {
    console.error("Failed to load obs-studio-node. Make sure it is installed and built.", e);
}

// Signal types from obs-studio-node
enum EOBSOutputType {
    Streaming = 'streaming',
    Recording = 'recording',
    ReplayBuffer = 'replay-buffer',
}

enum EOBSOutputSignal {
    Starting = 'starting',
    Start = 'start',
    Stopping = 'stopping',
    Stop = 'stop',
    Reconnect = 'reconnect',
    ReconnectSuccess = 'reconnect_success',
    Wrote = 'wrote',
    WriteError = 'writing_error',
    Activate = 'activate',
    Deactivate = 'deactivate',
}

interface IOBSOutputSignalInfo {
    type: EOBSOutputType;
    signal: EOBSOutputSignal;
    code: number;
    error: string;
    service?: string;
}

export class OBSManager {
    private static instance: OBSManager;
    private initialized = false;
    private replayBufferRunning = false;
    private pendingReplaySave: {
        resolve: (path: string) => void;
        reject: (err: Error) => void;
    } | null = null;
    private lastReplayPath: string | null = null;

    private constructor() {
        this.initIPC();
    }

    public static getInstance(): OBSManager {
        if (!OBSManager.instance) {
            OBSManager.instance = new OBSManager();
        }
        return OBSManager.instance;
    }

    private initIPC() {
        ipcMain.handle('obs-save-replay', async () => {
            return await this.saveReplayBuffer();
        });

        // Handle settings change - restart replay buffer with new settings
        ipcMain.handle('obs-restart', async () => {
            console.log('Restarting OBS with new settings...');
            await this.restartWithNewSettings();
            return { success: true };
        });
    }

    /**
     * Restart the replay buffer with new settings
     */
    public async restartWithNewSettings() {
        if (!this.initialized || !obs) return;

        // Stop replay buffer if running
        if (this.replayBufferRunning) {
            console.log('Stopping replay buffer for settings update...');
            obs.NodeObs.OBS_service_stopReplayBuffer(false);
            // Wait a bit for it to stop
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Re-apply settings
        this.setupVideo();
        this.setupOutput();

        // Restart replay buffer
        this.startReplayBuffer();
    }

    public initialize() {
        if (this.initialized || !obs) return;

        console.log("Initializing OBS...");

        // Host IPC for OBS
        obs.NodeObs.IPC.host(`luminreplay-${process.pid}`);

        // Set working directory - critical for loading plugins
        // This path depends on where the module is installed.
        // Usually node_modules/obs-studio-node
        const obsPath = path.join(process.cwd(), 'node_modules', 'obs-studio-node');
        obs.NodeObs.SetWorkingDirectory(obsPath);

        const userDataPath = app.getPath('userData');
        const obsDataPath = path.join(userDataPath, 'osn-data');

        if (!fs.existsSync(obsDataPath)) {
            fs.mkdirSync(obsDataPath, { recursive: true });
        }

        // Init API
        // Arguments: Locale, Path to store data, Version
        const initResult = obs.NodeObs.OBS_API_initAPI("en-US", obsDataPath, "1.0.0");
        console.log("OBS Init Result:", initResult);

        if (initResult === 0) {
            this.initialized = true;
            this.setupOutputSignals();
            this.setupVideo();
            this.setupOutput();
            this.setupScene();
        }
    }

    /**
     * Connect to OBS output signals for async callbacks
     */
    private setupOutputSignals() {
        if (!obs) return;

        // Connect to output signals
        obs.NodeObs.OBS_service_connectOutputSignals((signalInfo: IOBSOutputSignalInfo) => {
            this.handleOutputSignal(signalInfo);
        });
    }

    /**
     * Handle OBS output signals (recording, streaming, replay buffer)
     */
    private handleOutputSignal(signalInfo: IOBSOutputSignalInfo) {
        console.log('OBS Output Signal:', JSON.stringify(signalInfo, null, 2));

        if (signalInfo.type === EOBSOutputType.ReplayBuffer) {
            switch (signalInfo.signal) {
                case EOBSOutputSignal.Start:
                    console.log('Replay buffer started');
                    this.replayBufferRunning = true;
                    break;

                case EOBSOutputSignal.Stop:
                    console.log('Replay buffer stopped');
                    this.replayBufferRunning = false;
                    break;

                case EOBSOutputSignal.Wrote:
                    // Replay was saved successfully - get the file path
                    try {
                        const replayPath = obs.NodeObs.OBS_service_getLastReplay();
                        console.log('Replay saved to:', replayPath);
                        this.lastReplayPath = replayPath;

                        // Resolve pending save promise
                        if (this.pendingReplaySave) {
                            this.pendingReplaySave.resolve(replayPath);
                            this.pendingReplaySave = null;
                        }
                    } catch (err) {
                        console.error('Error getting last replay path:', err);
                        if (this.pendingReplaySave) {
                            this.pendingReplaySave.reject(new Error('Failed to get replay path'));
                            this.pendingReplaySave = null;
                        }
                    }
                    break;

                case EOBSOutputSignal.WriteError:
                    console.error('Replay buffer write error:', signalInfo.error);
                    if (this.pendingReplaySave) {
                        this.pendingReplaySave.reject(new Error(signalInfo.error || 'Write error'));
                        this.pendingReplaySave = null;
                    }
                    break;
            }
        }
    }

    private setupVideo() {
        if (!this.initialized) return;

        // Get settings
        const settings = SettingsManager.getInstance().getAllSettings();

        // Detect total screen size
        const displays = screen.getAllDisplays();

        // Calculate the bounding box that encompasses all monitors
        let minX = 0, minY = 0, maxX = 0, maxY = 0;

        displays.forEach((d, i) => {
            if (i === 0 || d.bounds.x < minX) minX = d.bounds.x;
            if (i === 0 || d.bounds.y < minY) minY = d.bounds.y;
            if (i === 0 || d.bounds.x + d.bounds.width > maxX) maxX = d.bounds.x + d.bounds.width;
            if (i === 0 || d.bounds.y + d.bounds.height > maxY) maxY = d.bounds.y + d.bounds.height;
        });

        const totalWidth = maxX - minX;
        const totalHeight = maxY - minY;

        console.log(`Configuring OBS Video: ${totalWidth}x${totalHeight} @ ${settings.fps}fps`);

        try {
            // Get current video settings using the correct API
            const videoSettingsResult = obs.NodeObs.OBS_settings_getSettings('Video');
            const videoSettings = videoSettingsResult?.data || [];

            // Helper function to update a setting value in the OBS settings structure
            const updateSetting = (settingsArr: any[], paramName: string, value: any) => {
                for (const category of settingsArr) {
                    if (category.parameters) {
                        for (const param of category.parameters) {
                            if (param.name === paramName) {
                                param.currentValue = value;
                                param.value = value;
                                return true;
                            }
                        }
                    }
                }
                return false;
            };

            // Update video settings
            // Base (canvas) resolution - format is "WIDTHxHEIGHT"
            updateSetting(videoSettings, 'Base', `${totalWidth}x${totalHeight}`);
            // Output (scaled) resolution
            updateSetting(videoSettings, 'Output', `${totalWidth}x${totalHeight}`);
            // FPS settings - use value from settings
            updateSetting(videoSettings, 'FPSType', 'Common FPS Values');
            updateSetting(videoSettings, 'FPSCommon', String(settings.fps));

            // Save video settings
            obs.NodeObs.OBS_settings_saveSettings('Video', videoSettings);
            console.log("Video settings configured successfully");

            // Configure Audio settings
            const audioSettingsResult = obs.NodeObs.OBS_settings_getSettings('Audio');
            const audioSettings = audioSettingsResult?.data || [];

            updateSetting(audioSettings, 'SampleRate', 44100);
            updateSetting(audioSettings, 'ChannelSetup', 'Stereo');

            obs.NodeObs.OBS_settings_saveSettings('Audio', audioSettings);
            console.log("Audio settings configured successfully");
        } catch (error) {
            console.error("Error configuring OBS settings:", error);
        }
    }

    /**
     * Configure output settings for replay buffer
     */
    private setupOutput() {
        if (!this.initialized || !obs) return;

        // Get settings from SettingsManager
        const settings = SettingsManager.getInstance().getAllSettings();

        console.log("Configuring output settings...");
        console.log(`  - Replay Buffer Duration: ${settings.replayBufferDuration}s`);
        console.log(`  - Replay Buffer Max Size: ${settings.replayBufferMaxSize}MB`);
        console.log(`  - Video Bitrate: ${settings.videoBitrate}kbps`);
        console.log(`  - Recording Format: ${settings.recordingFormat}`);
        console.log(`  - Recording Path: ${settings.recordingPath}`);

        try {
            // Get output settings
            const outputSettingsResult = obs.NodeObs.OBS_settings_getSettings('Output');
            const outputSettings = outputSettingsResult?.data || [];

            const updateSetting = (settingsArr: any[], paramName: string, value: any) => {
                for (const category of settingsArr) {
                    if (category.parameters) {
                        for (const param of category.parameters) {
                            if (param.name === paramName) {
                                param.currentValue = value;
                                param.value = value;
                                return true;
                            }
                        }
                    }
                }
                return false;
            };

            // Set output mode to Simple
            updateSetting(outputSettings, 'Mode', 'Simple');

            // Configure recording path from settings
            const recordingPath = settings.recordingPath || path.join(app.getPath('videos'), 'LuminReplay');
            if (!fs.existsSync(recordingPath)) {
                fs.mkdirSync(recordingPath, { recursive: true });
            }
            updateSetting(outputSettings, 'FilePath', recordingPath);

            // Set recording format from settings
            updateSetting(outputSettings, 'RecFormat', settings.recordingFormat);

            // Set video bitrate from settings
            updateSetting(outputSettings, 'VBitrate', settings.videoBitrate);

            // Set encoder quality (higher bitrate = higher quality)
            updateSetting(outputSettings, 'RecQuality', 'Stream');

            // Enable replay buffer
            updateSetting(outputSettings, 'RecRB', true);

            // Set replay buffer duration from settings
            updateSetting(outputSettings, 'RecRBTime', settings.replayBufferDuration);

            // Set replay buffer max size from settings
            updateSetting(outputSettings, 'RecRBSize', settings.replayBufferMaxSize);

            // Save output settings
            obs.NodeObs.OBS_settings_saveSettings('Output', outputSettings);
            console.log("Output settings configured. Replay path:", recordingPath);

        } catch (error) {
            console.error("Error configuring output settings:", error);
        }
    }

    private setupScene() {
        if (!this.initialized || !obs) return;

        console.log("Setting up scene...");

        try {
            // Create the main scene using obs.SceneFactory
            const sceneName = "MegaCanvas";
            const scene = obs.SceneFactory.create(sceneName);
            console.log(`Created scene: ${sceneName}`);

            // Get all displays
            const displays = screen.getAllDisplays();

            // Calculate the offset to normalize coordinates (make min x,y = 0)
            let minX = 0, minY = 0;
            displays.forEach((d, i) => {
                if (i === 0 || d.bounds.x < minX) minX = d.bounds.x;
                if (i === 0 || d.bounds.y < minY) minY = d.bounds.y;
            });

            displays.forEach((display, index) => {
                const sourceName = `Monitor-${index}`;

                console.log(`Creating source ${sourceName} for display ${display.id} at ${display.bounds.x},${display.bounds.y}`);

                try {
                    // Create monitor capture source
                    // On Windows, 'monitor_capture' is the source type for display capture
                    // The 'monitor' setting is the monitor index (0-based)
                    const inputSettings = {
                        monitor: index,
                        capture_cursor: true,
                    };

                    // Create the input source using InputFactory
                    const input = obs.InputFactory.create('monitor_capture', sourceName, inputSettings);

                    if (!input) {
                        console.error(`Failed to create input for monitor ${index}`);
                        return;
                    }

                    console.log(`Created input: ${sourceName}, dimensions: ${input.width}x${input.height}`);

                    // Add the input to the scene
                    const sceneItem = scene.add(input);

                    if (sceneItem) {
                        // Position the source based on monitor location
                        // Normalize position so leftmost/topmost is at 0,0
                        const posX = display.bounds.x - minX;
                        const posY = display.bounds.y - minY;

                        sceneItem.position = { x: posX, y: posY };
                        console.log(`Positioned ${sourceName} at (${posX}, ${posY})`);
                    } else {
                        console.error(`Failed to add ${sourceName} to scene`);
                    }
                } catch (sourceError) {
                    console.error(`Error creating source for monitor ${index}:`, sourceError);
                }
            });

            // Add desktop audio capture (Windows)
            try {
                const desktopAudio = obs.InputFactory.create('wasapi_output_capture', 'Desktop Audio', {
                    device_id: 'default'
                });
                if (desktopAudio) {
                    // Set desktop audio as an audio output source (channel 1 is typically desktop audio)
                    obs.Global.setOutputSource(1, desktopAudio);
                    console.log("Added desktop audio capture");
                }
            } catch (audioError) {
                console.error("Error adding desktop audio:", audioError);
            }

            // Optionally add microphone capture
            try {
                const micAudio = obs.InputFactory.create('wasapi_input_capture', 'Microphone', {
                    device_id: 'default'
                });
                if (micAudio) {
                    // Set mic audio as input source (channel 3 is typically mic)
                    obs.Global.setOutputSource(3, micAudio);
                    console.log("Added microphone capture");
                }
            } catch (micError) {
                console.error("Error adding microphone:", micError);
            }

            // Set this scene as the active scene for streaming/recording
            // obs.NodeObs uses Global.setOutputSource for output channel assignment
            // Channel 0 is typically the main output
            obs.Global.setOutputSource(0, scene.source);
            console.log("Set scene as output source");

        } catch (error) {
            console.error("Error setting up scene:", error);
        }

        // Start the replay buffer after scene setup
        this.startReplayBuffer();
    }

    /**
     * Start the OBS replay buffer
     */
    private startReplayBuffer() {
        if (!this.initialized || !obs) return;

        try {
            console.log("Starting Replay Buffer...");
            obs.NodeObs.OBS_service_startReplayBuffer();
        } catch (error) {
            console.error("Error starting replay buffer:", error);
        }
    }

    /**
     * Stop the OBS replay buffer
     */
    public stopReplayBuffer() {
        if (!this.replayBufferRunning || !obs) return;

        try {
            console.log("Stopping Replay Buffer...");
            obs.NodeObs.OBS_service_stopReplayBuffer(false);
        } catch (error) {
            console.error("Error stopping replay buffer:", error);
        }
    }

    /**
     * Save the replay buffer and return the path to the saved file
     * Returns a Promise that resolves when the file is saved
     */
    public async saveReplayBuffer(): Promise<string> {
        console.log("Saving Replay Buffer...");

        if (!this.initialized || !obs) {
            throw new Error("OBS not initialized");
        }

        if (!this.replayBufferRunning) {
            throw new Error("Replay buffer is not running");
        }

        // Create a promise that will be resolved when we receive the 'Wrote' signal
        return new Promise((resolve, reject) => {
            // Set a timeout in case the signal never comes
            const timeout = setTimeout(() => {
                if (this.pendingReplaySave) {
                    this.pendingReplaySave = null;
                    reject(new Error("Replay save timeout - no response from OBS"));
                }
            }, 10000); // 10 second timeout

            this.pendingReplaySave = {
                resolve: (path: string) => {
                    clearTimeout(timeout);
                    resolve(path);
                },
                reject: (err: Error) => {
                    clearTimeout(timeout);
                    reject(err);
                }
            };

            try {
                // Trigger the replay buffer save via the hotkey function
                obs.NodeObs.OBS_service_processReplayBufferHotkey();
            } catch (error) {
                this.pendingReplaySave = null;
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Get the last saved replay path (if available)
     */
    public getLastReplayPath(): string | null {
        return this.lastReplayPath;
    }

    /**
     * Check if replay buffer is currently running
     */
    public isReplayBufferRunning(): boolean {
        return this.replayBufferRunning;
    }

    public getMonitors() {
        return screen.getAllDisplays().map((d, i) => ({
            id: d.id,
            x: d.bounds.x,
            y: d.bounds.y,
            width: d.bounds.width,
            height: d.bounds.height,
            index: i
        }));
    }

    public async processReplay(filePath: string, monitorIndex: number | 'all') {
        console.log(`Processing replay: ${filePath} for monitor ${monitorIndex}`);

        // Verify file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`Replay file not found: ${filePath}`);
        }

        if (monitorIndex === 'all') {
            // Just move or rename the file
            const dest = filePath.replace('.mp4', '-all.mp4'); // Example logic
            fs.copyFileSync(filePath, dest);
            return dest;
        }

        const displays = this.getMonitors();
        const monitor = displays[monitorIndex as number];

        if (!monitor) throw new Error("Monitor not found");

        const output = filePath.replace('.mp4', `-monitor${monitorIndex}.mp4`);

        return new Promise((resolve, reject) => {
            ffmpeg(filePath)
                .videoFilters([
                    `crop=${monitor.width}:${monitor.height}:${monitor.x}:${monitor.y}`
                ])
                .output(output)
                .on('end', () => {
                    console.log('Processing finished:', output);
                    resolve(output);
                })
                .on('error', (err) => {
                    console.error('Error processing:', err);
                    reject(err);
                })
                .run();
        });
    }

    /**
     * Cleanup OBS resources on app exit
     */
    public shutdown() {
        if (!this.initialized || !obs) return;

        try {
            console.log("Shutting down OBS...");

            // Stop replay buffer if running
            if (this.replayBufferRunning) {
                obs.NodeObs.OBS_service_stopReplayBuffer(true);
            }

            // Disconnect IPC
            obs.NodeObs.IPC.disconnect();
        } catch (error) {
            console.error("Error shutting down OBS:", error);
        }
    }
}
