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
    private isRestarting = false;  // Flag to track intentional restart
    private pendingStopResolve: (() => void) | null = null;  // Promise resolver for stop signal
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

        this.isRestarting = true;

        // Stop replay buffer if running and wait for the stop signal
        if (this.replayBufferRunning) {
            console.log('Stopping replay buffer for settings update...');

            // Create a promise that resolves when we get the stop signal
            const stopPromise = new Promise<void>((resolve) => {
                this.pendingStopResolve = resolve;
            });

            // Also set a timeout in case the signal doesn't come
            const timeoutPromise = new Promise<void>((resolve) => {
                setTimeout(() => {
                    console.log('Stop signal timeout, proceeding anyway...');
                    resolve();
                }, 2000);
            });

            obs.NodeObs.OBS_service_stopReplayBuffer(false);

            // Wait for either the stop signal or timeout
            await Promise.race([stopPromise, timeoutPromise]);

            // Clear the resolver
            this.pendingStopResolve = null;

            // Small additional delay to ensure OBS is fully ready
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Re-apply settings
        this.setupVideo();
        this.setupOutput();
        this.setupScene();

        // Restart replay buffer
        this.startReplayBuffer();

        this.isRestarting = false;
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
            this.startReplayBuffer();
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
                    // Resolve the pending stop promise if we're waiting for it
                    if (this.pendingStopResolve) {
                        this.pendingStopResolve();
                        // Don't set replayBufferRunning to false here since we're restarting
                    } else if (!this.isRestarting) {
                        // Only set to false if we're NOT in the middle of a restart
                        this.replayBufferRunning = false;
                    }
                    break;

                case EOBSOutputSignal.Wrote:
                    // Replay was saved successfully - get the file path
                    try {
                        let replayPath = obs.NodeObs.OBS_service_getLastReplay();
                        console.log('Replay saved to:', replayPath);

                        // Rename file if it starts with default "Replay"
                        const fileName = path.basename(replayPath);
                        if (fileName.startsWith('Replay')) {
                            const dir = path.dirname(replayPath);
                            const newFileName = fileName.replace('Replay', 'LuminReplay');
                            const newPath = path.join(dir, newFileName);
                            try {
                                fs.renameSync(replayPath, newPath);
                                console.log('Renamed replay to:', newPath);
                                replayPath = newPath;
                            } catch (renameErr) {
                                console.error('Error renaming replay file:', renameErr);
                            }
                        }

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
        const allDisplays = screen.getAllDisplays();

        // Filter to only enabled monitors
        const displays = allDisplays.filter((_, i) => {
            if (!settings.enabledMonitors) return true; // All enabled if undefined
            return settings.enabledMonitors.includes(i);
        });

        // If no monitors enabled, fall back to all
        if (displays.length === 0) {
            console.warn("No monitors enabled, using all displays");
            displays.push(...allDisplays);
        }

        // Calculate the bounding box that encompasses enabled monitors (native resolution)
        let minX = 0, minY = 0, maxX = 0, maxY = 0;

        displays.forEach((d, i) => {
            if (i === 0 || d.bounds.x < minX) minX = d.bounds.x;
            if (i === 0 || d.bounds.y < minY) minY = d.bounds.y;
            if (i === 0 || d.bounds.x + d.bounds.width > maxX) maxX = d.bounds.x + d.bounds.width;
            if (i === 0 || d.bounds.y + d.bounds.height > maxY) maxY = d.bounds.y + d.bounds.height;
        });

        const nativeWidth = maxX - minX;
        const nativeHeight = maxY - minY;

        // Helper function to calculate resolution from preset
        // For presets, we scale proportionally based on height to maintain aspect ratio
        // This is important for multi-monitor mega-canvas setups (e.g., 3840x1080)
        const getResolutionFromPreset = (
            preset: string,
            customRes: { width: number; height: number } | undefined,
            nativeW: number,
            nativeH: number
        ): { width: number; height: number } => {
            switch (preset) {
                case '1080p': {
                    // Scale proportionally to 1080 height
                    const scale = 1080 / nativeH;
                    return { width: Math.round(nativeW * scale), height: 1080 };
                }
                case '720p': {
                    // Scale proportionally to 720 height
                    const scale = 720 / nativeH;
                    return { width: Math.round(nativeW * scale), height: 720 };
                }
                case '480p': {
                    // Scale proportionally to 480 height
                    const scale = 480 / nativeH;
                    return { width: Math.round(nativeW * scale), height: 480 };
                }
                case 'custom':
                    return customRes || { width: 1920, height: 1080 };
                case 'native':
                default:
                    return { width: nativeW, height: nativeH };
            }
        };

        // Calculate capture (base) resolution
        const captureRes = getResolutionFromPreset(
            settings.captureResolution,
            settings.customCaptureResolution,
            nativeWidth,
            nativeHeight
        );

        // Calculate output resolution
        const outputRes = getResolutionFromPreset(
            settings.outputResolution,
            settings.customOutputResolution,
            nativeWidth,
            nativeHeight
        );

        console.log(`Configuring OBS Video:`);
        console.log(`  Native: ${nativeWidth}x${nativeHeight}`);
        console.log(`  Capture (Base): ${captureRes.width}x${captureRes.height} (${settings.captureResolution})`);
        console.log(`  Output: ${outputRes.width}x${outputRes.height} (${settings.outputResolution})`);
        console.log(`  FPS: ${settings.fps} (${displays.length} monitor(s))`);

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
            // Base (canvas) resolution - this is what gets captured
            updateSetting(videoSettings, 'Base', `${captureRes.width}x${captureRes.height}`);
            // Output (scaled) resolution - this is what gets saved to file
            updateSetting(videoSettings, 'Output', `${outputRes.width}x${outputRes.height}`);
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
        console.log(`  - Video Bitrate: ${settings.videoBitrate} kbps (${(settings.videoBitrate / 1000).toFixed(1)} Mbps)`);
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
                                console.log(`    [UPDATE] ${paramName}: ${param.currentValue} -> ${value}`);
                                param.currentValue = value;
                                param.value = value;
                                return true;
                            }
                        }
                    }
                }
                console.log(`    [NOT FOUND] ${paramName}`);
                return false;
            };

            // Step 1: Switch to Advanced mode
            updateSetting(outputSettings, 'Mode', 'Advanced');
            obs.NodeObs.OBS_settings_saveSettings('Output', outputSettings);

            // Step 2: Re-get settings to see Advanced mode parameters
            let advancedSettings = obs.NodeObs.OBS_settings_getSettings('Output')?.data || [];

            // Configure recording path from settings
            const recordingPath = settings.recordingPath || path.join(app.getPath('videos'), 'LuminReplay');
            if (!fs.existsSync(recordingPath)) {
                fs.mkdirSync(recordingPath, { recursive: true });
            }
            updateSetting(advancedSettings, 'RecFilePath', recordingPath);

            // Set recording format from settings
            updateSetting(advancedSettings, 'RecFormat', settings.recordingFormat);

            // Set recording type to Standard (not FFmpeg)
            updateSetting(advancedSettings, 'RecType', 'Standard');

            // Step 3: Set the encoder - IMPORTANT: use correct name for Advanced mode
            // 'jim_nvenc_h264' (Simple mode) -> 'jim_nvenc' (Advanced mode)
            // 'x264' (Simple mode) -> 'obs_x264' (Advanced mode)
            let advancedEncoder = settings.videoEncoder;
            if (settings.videoEncoder === 'jim_nvenc_h264') {
                advancedEncoder = 'jim_nvenc';
            } else if (settings.videoEncoder === 'x264') {
                advancedEncoder = 'obs_x264';
            }

            console.log(`  - Setting encoder: ${advancedEncoder} (from ${settings.videoEncoder})`);
            updateSetting(advancedSettings, 'RecEncoder', advancedEncoder);

            // Step 4: Save to register encoder change
            obs.NodeObs.OBS_settings_saveSettings('Output', advancedSettings);

            // Step 5: Re-fetch settings to get encoder-specific parameters
            advancedSettings = obs.NodeObs.OBS_settings_getSettings('Output')?.data || [];

            // Debug: show Recording category after encoder selection
            console.log("=== Recording settings after encoder selection ===");
            for (const category of advancedSettings) {
                if (category.nameSubCategory === 'Recording') {
                    if (category.parameters) {
                        for (const param of category.parameters) {
                            console.log(`  - ${param.name}: ${param.currentValue}`);
                        }
                    }
                }
            }
            console.log("=== END ===");

            // Step 6: Now set encoder-specific settings (these only appear after encoder is set)
            // Use CQP (Constant Quality) instead of CBR for lower GPU usage
            // CQP is more efficient as it doesn't force constant bitrate
            console.log(`  - Setting rate control to CQP for efficiency`);
            updateSetting(advancedSettings, 'Recrate_control', 'CQP');

            // CQP quality value based on encoderPreset
            // Lower = better quality, higher file size
            const cqpValues = {
                'performance': 23,  // Lighter encoding, smaller files
                'balanced': 21,     // Good balance
                'quality': 18       // Best quality, larger files
            };
            const cqp = cqpValues[settings.encoderPreset] || 21;
            console.log(`  - Setting CQP to ${cqp} (preset: ${settings.encoderPreset})`);
            updateSetting(advancedSettings, 'Reccqp', cqp);

            // Set max bitrate as a ceiling (for VBR-like behavior within CQP)
            updateSetting(advancedSettings, 'Recmax_bitrate', settings.videoBitrate);

            // NVENC-specific optimizations based on encoderPreset:
            // Preset: p1 (fastest/lowest GPU) to p7 (slowest/best quality)
            const presetMap = {
                'performance': 'p1',  // Fastest, lowest GPU usage (like ShadowPlay)
                'balanced': 'p4',     // Middle ground
                'quality': 'p7'       // Best quality, highest GPU usage
            };
            const nvencPreset = presetMap[settings.encoderPreset] || 'p1';
            console.log(`  - Setting NVENC preset to ${nvencPreset}`);
            updateSetting(advancedSettings, 'Recpreset', nvencPreset);

            // Tune settings based on preset - performance mode disables everything for minimum GPU
            if (settings.encoderPreset === 'performance') {
                updateSetting(advancedSettings, 'Reclookahead', false);  // Disable lookahead
                updateSetting(advancedSettings, 'Recpsycho_aq', false);  // Disable psycho-visual tuning
                updateSetting(advancedSettings, 'Recbframes', 0);        // No B-frames (lower latency)
            } else if (settings.encoderPreset === 'balanced') {
                updateSetting(advancedSettings, 'Reclookahead', false);
                updateSetting(advancedSettings, 'Recpsycho_aq', true);   // Enable AQ for better quality
                updateSetting(advancedSettings, 'Recbframes', 0);
            } else {
                // Quality mode - enable all quality features
                updateSetting(advancedSettings, 'Reclookahead', true);
                updateSetting(advancedSettings, 'Recpsycho_aq', true);
                updateSetting(advancedSettings, 'Recbframes', 2);
            }

            // Enable replay buffer
            updateSetting(advancedSettings, 'RecRB', true);

            // Set replay buffer duration from settings
            updateSetting(advancedSettings, 'RecRBTime', settings.replayBufferDuration);

            // Step 7: Save final settings
            obs.NodeObs.OBS_settings_saveSettings('Output', advancedSettings);
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
            const sceneName = `MegaCanvas-${Date.now()}`;
            const scene = obs.SceneFactory.create(sceneName);
            console.log(`Created scene: ${sceneName}`);

            // Get all displays
            const allDisplays = screen.getAllDisplays();

            // Get settings for enabled monitors
            const settings = SettingsManager.getInstance().getAllSettings();
            const enabledMonitors = settings.enabledMonitors;

            // Filter to only enabled monitors
            const displays = allDisplays.filter((_, i) => {
                if (!enabledMonitors) return true;
                return enabledMonitors.includes(i);
            });

            if (displays.length === 0) {
                console.warn("No monitors enabled, using all displays for scene");
                displays.push(...allDisplays);
            }

            // Calculate native bounding box
            let minX = 0, minY = 0, maxX = 0, maxY = 0;
            displays.forEach((d, i) => {
                if (i === 0 || d.bounds.x < minX) minX = d.bounds.x;
                if (i === 0 || d.bounds.y < minY) minY = d.bounds.y;
                if (i === 0 || d.bounds.x + d.bounds.width > maxX) maxX = d.bounds.x + d.bounds.width;
                if (i === 0 || d.bounds.y + d.bounds.height > maxY) maxY = d.bounds.y + d.bounds.height;
            });

            const nativeWidth = maxX - minX;
            const nativeHeight = maxY - minY;

            // Helper function to get resolution from preset (same as in setupVideo)
            const getResolutionFromPreset = (
                preset: string,
                customRes: { width: number; height: number } | undefined,
                nativeW: number,
                nativeH: number
            ): { width: number; height: number } => {
                switch (preset) {
                    case '1080p': {
                        const scale = 1080 / nativeH;
                        return { width: Math.round(nativeW * scale), height: 1080 };
                    }
                    case '720p': {
                        const scale = 720 / nativeH;
                        return { width: Math.round(nativeW * scale), height: 720 };
                    }
                    case '480p': {
                        const scale = 480 / nativeH;
                        return { width: Math.round(nativeW * scale), height: 480 };
                    }
                    case 'custom':
                        return customRes || { width: 1920, height: 1080 };
                    case 'native':
                    default:
                        return { width: nativeW, height: nativeH };
                }
            };

            // Calculate capture resolution and scale factor
            const captureRes = getResolutionFromPreset(
                settings.captureResolution,
                settings.customCaptureResolution,
                nativeWidth,
                nativeHeight
            );

            // Calculate scale factor from native to capture resolution
            const scaleX = captureRes.width / nativeWidth;
            const scaleY = captureRes.height / nativeHeight;

            console.log(`Scene scaling: Native ${nativeWidth}x${nativeHeight} -> Capture ${captureRes.width}x${captureRes.height}`);
            console.log(`  Scale factors: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);

            // Add each enabled display to the scene
            allDisplays.forEach((display, index) => {
                // Skip if monitor is not enabled
                if (enabledMonitors && !enabledMonitors.includes(index)) {
                    console.log(`Skipping Monitor-${index} (disabled in settings)`);
                    return;
                }

                const sourceName = `Monitor-${index}`;
                console.log(`Creating source ${sourceName} for display ${display.id}`);

                try {
                    // Optimized capture settings for lower GPU usage
                    const inputSettings = {
                        monitor: index,
                        capture_cursor: true,
                        // Use DXGI duplication for more efficient capture
                        // (This is the default on Windows 8+, but explicitly set)
                        method: 0,  // 0 = Auto (DXGI on Win8+), 1 = WGC, 2 = DXGI
                    };

                    // Try to create the input with monitor_capture
                    // Note: game_capture would be more efficient but only captures fullscreen games
                    let input = obs.InputFactory.create('monitor_capture', sourceName, inputSettings);

                    // If failed (likely exists), try to retrieve it
                    if (!input) {
                        try {
                            input = obs.InputFactory.fromName(sourceName);
                        } catch (e) {
                            console.warn(`Could not retrieve existing input ${sourceName}`, e);
                        }
                    }

                    if (input) {
                        console.log(`Got input: ${sourceName}, dimensions: ${input.width}x${input.height}`);

                        // Add the input to the scene
                        const sceneItem = scene.add(input);

                        if (sceneItem) {
                            // Calculate scaled position relative to the capture canvas
                            const posX = (display.bounds.x - minX) * scaleX;
                            const posY = (display.bounds.y - minY) * scaleY;

                            // Apply position
                            sceneItem.position = { x: posX, y: posY };

                            // Apply scale to the source if we're downscaling
                            if (scaleX !== 1 || scaleY !== 1) {
                                sceneItem.scale = { x: scaleX, y: scaleY };
                                console.log(`Positioned ${sourceName} at (${posX.toFixed(0)}, ${posY.toFixed(0)}) with scale ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);
                            } else {
                                console.log(`Positioned ${sourceName} at (${posX}, ${posY})`);
                            }
                        } else {
                            console.error(`Failed to add ${sourceName} to scene`);
                        }
                    } else {
                        console.error(`Failed to create or retrieve input for monitor ${index}`);
                    }
                } catch (sourceError) {
                    console.error(`Error handling source for monitor ${index}:`, sourceError);
                }
            });

            // Add desktop audio capture
            try {
                const daName = 'Desktop Audio';
                let desktopAudio = obs.InputFactory.create('wasapi_output_capture', daName, { device_id: 'default' });
                if (!desktopAudio) {
                    try { desktopAudio = obs.InputFactory.fromName(daName); } catch (e) { }
                }

                if (desktopAudio) {
                    obs.Global.setOutputSource(1, desktopAudio);
                    console.log("Added desktop audio capture");
                }
            } catch (audioError) {
                console.error("Error adding desktop audio:", audioError);
            }

            // Add microphone capture
            try {
                const micName = 'Microphone';
                let micAudio = obs.InputFactory.create('wasapi_input_capture', micName, { device_id: 'default' });
                if (!micAudio) {
                    try { micAudio = obs.InputFactory.fromName(micName); } catch (e) { }
                }

                if (micAudio) {
                    obs.Global.setOutputSource(3, micAudio);
                    console.log("Added microphone capture");
                }
            } catch (micError) {
                console.error("Error adding microphone:", micError);
            }

            // Set this scene as the active scene
            obs.Global.setOutputSource(0, scene.source);
            console.log("Set scene as output source");

        } catch (error) {
            console.error("Error setting up scene:", error);
        }
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

        const displays = this.getMonitors();
        const settings = SettingsManager.getInstance().getAllSettings();

        // Calculate native bounding box
        let minX = 0, minY = 0, maxX = 0, maxY = 0;
        displays.forEach((d, i) => {
            if (i === 0 || d.x < minX) minX = d.x;
            if (i === 0 || d.y < minY) minY = d.y;
            if (i === 0 || d.x + d.width > maxX) maxX = d.x + d.width;
            if (i === 0 || d.y + d.height > maxY) maxY = d.y + d.height;
        });

        const nativeWidth = maxX - minX;
        const nativeHeight = maxY - minY;

        // Helper function to get resolution from preset (same as in setupVideo)
        const getResolutionFromPreset = (
            preset: string,
            customRes: { width: number; height: number } | undefined,
            nativeW: number,
            nativeH: number
        ): { width: number; height: number } => {
            switch (preset) {
                case '1080p': {
                    const scale = 1080 / nativeH;
                    return { width: Math.round(nativeW * scale), height: 1080 };
                }
                case '720p': {
                    const scale = 720 / nativeH;
                    return { width: Math.round(nativeW * scale), height: 720 };
                }
                case '480p': {
                    const scale = 480 / nativeH;
                    return { width: Math.round(nativeW * scale), height: 480 };
                }
                case 'custom':
                    return customRes || { width: 1920, height: 1080 };
                case 'native':
                default:
                    return { width: nativeW, height: nativeH };
            }
        };

        // Get the output resolution that OBS used when recording
        const outputRes = getResolutionFromPreset(
            settings.outputResolution,
            settings.customOutputResolution,
            nativeWidth,
            nativeHeight
        );

        // Calculate scale factor from native to output resolution
        const scaleX = outputRes.width / nativeWidth;
        const scaleY = outputRes.height / nativeHeight;

        console.log(`Processing with resolution settings:`);
        console.log(`  Native: ${nativeWidth}x${nativeHeight}`);
        console.log(`  Output: ${outputRes.width}x${outputRes.height}`);
        console.log(`  Scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);

        const processOne = (index: number): Promise<string> => {
            const monitor = displays[index];
            if (!monitor) return Promise.reject(new Error("Monitor not found"));

            // Calculate crop coordinates relative to the canvas origin, scaled to output resolution
            const cropX = Math.round((monitor.x - minX) * scaleX);
            const cropY = Math.round((monitor.y - minY) * scaleY);
            const cropW = Math.round(monitor.width * scaleX);
            const cropH = Math.round(monitor.height * scaleY);

            // Output filename: Replay 2024... -> Replay 2024...-monitor-1.mp4
            const output = filePath.replace(/(\.[^.]+)$/, `-monitor-${index + 1}$1`);

            console.log(`Cropping monitor ${index + 1}: ${cropW}x${cropH} at (${cropX}, ${cropY})`);

            return new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .videoFilters([
                        `crop=${cropW}:${cropH}:${cropX}:${cropY}`
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
        };

        if (monitorIndex === 'all') {
            // Process ALL monitors separately
            console.log("Splitting mega-canvas into separate monitor files...");

            // Filter only enabled monitors
            const enabledIndices = settings.enabledMonitors;

            let monitorsToProcess = displays.map((_, i) => i);
            if (enabledIndices) {
                monitorsToProcess = monitorsToProcess.filter(i => enabledIndices.includes(i));
            }

            const results = await Promise.all(monitorsToProcess.map(i => processOne(i)));

            // Delete the original mega-canvas file after successfully splitting
            try {
                fs.unlinkSync(filePath);
                console.log('Deleted original mega-canvas file:', filePath);
            } catch (deleteErr) {
                console.error('Failed to delete original mega-canvas file:', deleteErr);
            }

            return results;
        } else {
            const result = await processOne(monitorIndex as number);

            // Delete the original mega-canvas file after successfully cropping
            try {
                fs.unlinkSync(filePath);
                console.log('Deleted original mega-canvas file:', filePath);
            } catch (deleteErr) {
                console.error('Failed to delete original mega-canvas file:', deleteErr);
            }

            return result;
        }
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
