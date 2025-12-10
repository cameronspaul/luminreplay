import React, { useEffect, useState } from 'react';
import './Settings.css';

type ResolutionPreset = 'native' | '1080p' | '720p' | '480p' | 'custom';

interface CustomResolution {
    width: number;
    height: number;
}

interface AppSettings {
    replayBufferDuration: number;
    replayBufferMaxSize: number;
    videoBitrate: number;
    videoEncoder: string;
    encoderPreset: 'performance' | 'balanced' | 'quality';
    fps: number;
    captureResolution: ResolutionPreset;
    outputResolution: ResolutionPreset;
    customCaptureResolution?: CustomResolution;
    customOutputResolution?: CustomResolution;
    recordingFormat: 'mp4' | 'mkv' | 'flv';
    recordingPath: string;
    captureDesktopAudio: boolean;
    captureMicrophone: boolean;
    replayHotkey: string;
    monitor1Hotkey?: string;
    monitor2Hotkey?: string;
    allMonitorsHotkey?: string;
    bufferToggleHotkey?: string;
    enabledMonitors?: number[];
    openAtLogin?: boolean;
}

interface MonitorInfo {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
}

const Settings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [isCustomDuration, setIsCustomDuration] = useState(false);
    const [isCustomBitrate, setIsCustomBitrate] = useState(false);

    // Track which hotkey is currently being recorded (null if none)
    const [recordingHotkeyField, setRecordingHotkeyField] = useState<keyof AppSettings | null>(null);

    // Initialize custom mode based on loaded settings
    useEffect(() => {
        if (settings) {
            // If duration is > 3 minutes (180s) or not a multiple of 10, default to custom mode
            if (settings.replayBufferDuration > 180 || settings.replayBufferDuration % 10 !== 0) {
                setIsCustomDuration(true);
            }
            // If bitrate is > 50000 kbps or not a multiple of 1000, default to custom mode
            if (settings.videoBitrate > 50000 || settings.videoBitrate % 1000 !== 0) {
                setIsCustomBitrate(true);
            }
        }
    }, [loading]); // Run check when loading completes

    // Preset options
    const fpsOptions = [30, 60, 120];

    // Resolution presets
    const resolutionPresets: ResolutionPreset[] = ['native', '1080p', '720p', '480p', 'custom'];
    const resolutionLabels: Record<ResolutionPreset, string> = {
        'native': 'Native',
        '1080p': '1080p',
        '720p': '720p',
        '480p': '480p',
        'custom': 'Custom'
    };

    const formatOptions = ['mp4', 'mkv', 'flv'] as const;

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            // @ts-ignore
            const s = await window.electronAPI?.getSettings();
            setSettings(s);

            // @ts-ignore
            const m = await window.electronAPI?.getMonitors();
            setMonitors(m || []);
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        if (!settings) return;
        setSettings({ ...settings, [key]: value });
        setHasChanges(true);
    };

    const handleMonitorToggle = (index: number, checked: boolean) => {
        if (!settings) return;

        let current = settings.enabledMonitors;
        // If undefined, it means "all enabled". Initialize it with all monitor indices first
        if (!current) {
            current = monitors.map(m => m.index);
        }

        let next: number[];
        if (checked) {
            if (!current.includes(index)) {
                next = [...current, index];
            } else {
                next = current;
            }
        } else {
            next = current.filter(i => i !== index);
        }

        // Sort just in case
        next.sort((a, b) => a - b);

        handleChange('enabledMonitors', next);
    };

    const handleHotkeyKeyDown = (e: React.KeyboardEvent, field: keyof AppSettings) => {
        if (recordingHotkeyField !== field) return;

        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
            setRecordingHotkeyField(null);
            return;
        }

        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Super'); // Often mapped to CommandOrControl on Mac, Super on Windows
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Ignore if only modifiers are pressed
        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;

        let key = e.key.toUpperCase();

        // Map common keys to Electron format
        if (key === ' ') key = 'Space';
        else if (key.length === 1) key = key.toUpperCase();
        else if (key.startsWith('ARROW')) key = key.replace('ARROW', ''); // Up, Down, Left, Right

        // Handle function keys
        if (/^F\d+$/.test(key)) {
            // Keep as is (F1, F10, etc)
        }

        const hotkey = [...modifiers, key].join('+');
        handleChange(field, hotkey as AppSettings[typeof field]);
        setRecordingHotkeyField(null);
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            // @ts-ignore
            await window.electronAPI?.setSettings(settings);
            // Restart OBS with new settings
            // @ts-ignore
            await window.electronAPI?.restartOBS();
            // Update Hotkeys
            // @ts-ignore
            await window.electronAPI?.updateHotkey();

            setHasChanges(false);
            alert('Settings saved! OBS has been reconfigured.');
        } catch (err) {
            console.error('Failed to save settings:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('Reset all settings to defaults?')) return;
        try {
            // @ts-ignore
            const s = await window.electronAPI?.resetSettings();
            setSettings(s);
            setHasChanges(true);
        } catch (err) {
            console.error('Failed to reset settings:', err);
        }
    };

    const handlePickFolder = async () => {
        try {
            // @ts-ignore
            const path = await window.electronAPI?.pickFolder();
            if (path) {
                handleChange('recordingPath', path);
            }
        } catch (err) {
            console.error('Failed to pick folder:', err);
        }
    };

    if (loading) {
        return (
            <div className="settings-container">
                <div className="settings-loading">Loading settings...</div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="settings-container">
                <div className="settings-error">Failed to load settings</div>
                <button onClick={onBack} className="settings-back-btn">Back</button>
            </div>
        );
    }

    return (
        <div className="settings-container">
            <div className="settings-header">
                <button onClick={onBack} className="settings-back-btn">
                    ← Back
                </button>
                <div className="settings-header-actions">
                    <button onClick={handleReset} className="settings-reset-btn">
                        Reset Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`settings-save-btn ${hasChanges ? 'has-changes' : ''}`}
                    >
                        {saving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
                    </button>
                </div>
            </div>

            <div className="settings-content">
                {/* System Section */}
                <section className="settings-section">
                    <h2>System</h2>
                    <div className="settings-row">
                        <label>Open at Login</label>
                        <div className="settings-input-group">
                            <label className="settings-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.openAtLogin || false}
                                    onChange={(e) => handleChange('openAtLogin', e.target.checked)}
                                />
                                <span className="settings-switch-slider"></span>
                            </label>
                            <span className="settings-hint">Launch LuminReplay when you sign in to Windows</span>
                        </div>
                    </div>
                </section>

                {/* Replay Buffer Section */}
                <section className="settings-section">
                    <h2>Replay Buffer</h2>

                    <div className="settings-row">
                        <label>Buffer Duration</label>
                        <div className="settings-input-group">
                            {!isCustomDuration ? (
                                <div className="settings-slider-container">
                                    <input
                                        type="range"
                                        min="10"
                                        max="180"
                                        step="10"
                                        value={Math.min(settings.replayBufferDuration, 180)}
                                        onChange={(e) => handleChange('replayBufferDuration', Number(e.target.value))}
                                    />
                                    <span className="settings-slider-value">
                                        {settings.replayBufferDuration >= 60
                                            ? `${Math.floor(settings.replayBufferDuration / 60)}m ${settings.replayBufferDuration % 60 > 0 ? settings.replayBufferDuration % 60 + 's' : ''}`
                                            : `${settings.replayBufferDuration}s`}
                                    </span>
                                    <button
                                        className="settings-toggle-btn"
                                        onClick={() => setIsCustomDuration(true)}
                                        style={{ marginLeft: '10px', whiteSpace: 'nowrap' }}
                                    >
                                        Custom
                                    </button>
                                </div>
                            ) : (
                                <div className="settings-custom-duration-container" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        padding: '0 1rem',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <input
                                            type="number"
                                            min="1"
                                            value={settings.replayBufferDuration || ''}
                                            onChange={(e) => handleChange('replayBufferDuration', parseInt(e.target.value) || 0)}
                                            onBlur={() => {
                                                if (settings.replayBufferDuration < 1) handleChange('replayBufferDuration', 1);
                                            }}
                                            className="settings-number-input-custom"
                                            placeholder="Seconds"
                                            style={{
                                                flex: 1,
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#f3f4f6',
                                                padding: '0.75rem 0',
                                                fontSize: '0.95rem',
                                                outline: 'none',
                                                width: '100%'
                                            }}
                                        />
                                        <span style={{ color: '#9ca3af', fontSize: '0.9rem', whiteSpace: 'nowrap', marginLeft: '10px', userSelect: 'none' }}>
                                            {Math.floor(settings.replayBufferDuration / 60)}m {settings.replayBufferDuration % 60}s
                                        </span>
                                    </div>
                                    <button
                                        className="settings-toggle-btn active"
                                        onClick={() => {
                                            setIsCustomDuration(false);
                                            // Optional: Clamp back to range if needed, or let the slider handle it (it uses min/max)
                                            if (settings.replayBufferDuration > 180) {
                                                handleChange('replayBufferDuration', 180);
                                            } else if (settings.replayBufferDuration < 10) {
                                                handleChange('replayBufferDuration', 10);
                                            } else {
                                                // Round to nearest 10
                                                handleChange('replayBufferDuration', Math.round(settings.replayBufferDuration / 10) * 10);
                                            }
                                        }}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        Slider
                                    </button>
                                </div>
                            )}
                            <span className="settings-hint">
                                {isCustomDuration
                                    ? "Enter duration in seconds"
                                    : "Slide to adjust duration (up to 3 minutes)"}
                            </span>
                        </div>
                    </div>

                    <div className="settings-row">
                        <label>Max Buffer Size</label>
                        <div className="settings-input-group">
                            <div className="settings-slider-container">
                                <input
                                    type="range"
                                    min="256"
                                    max="4096"
                                    step="256"
                                    value={settings.replayBufferMaxSize}
                                    onChange={(e) => handleChange('replayBufferMaxSize', Number(e.target.value))}
                                />
                                <span className="settings-slider-value">{settings.replayBufferMaxSize} MB</span>
                            </div>
                            <span className="settings-hint">Maximum memory used for replay buffer</span>
                        </div>
                    </div>
                </section>

                {/* Video Quality Section */}
                <section className="settings-section">
                    <h2>Video Quality</h2>

                    <div className="settings-row">
                        <label>Frame Rate (FPS)</label>
                        <div className="settings-input-group">
                            <div className="settings-toggle-group">
                                {fpsOptions.map(fps => (
                                    <button
                                        key={fps}
                                        className={`settings-toggle-btn ${settings.fps === fps ? 'active' : ''}`}
                                        onClick={() => handleChange('fps', fps)}
                                    >
                                        {fps}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="settings-row">
                        <label>Video Encoder</label>
                        <div className="settings-input-group">
                            <div className="settings-toggle-group">
                                <button
                                    className={`settings-toggle-btn ${settings.videoEncoder !== 'x264' ? 'active' : ''}`}
                                    onClick={() => handleChange('videoEncoder', 'jim_nvenc_h264')}
                                >
                                    NVIDIA NVENC
                                </button>
                                <button
                                    className={`settings-toggle-btn ${settings.videoEncoder === 'x264' ? 'active' : ''}`}
                                    onClick={() => handleChange('videoEncoder', 'x264')}
                                >
                                    Software (x264)
                                </button>
                            </div>
                            <span className="settings-hint">
                                NVENC moves recording load to the GPU, improving game performance.
                            </span>
                        </div>
                    </div>

                    <div className="settings-row">
                        <label>Encoder Preset</label>
                        <div className="settings-input-group">
                            <div className="settings-toggle-group">
                                <button
                                    className={`settings-toggle-btn ${settings.encoderPreset === 'performance' ? 'active' : ''}`}
                                    onClick={() => handleChange('encoderPreset', 'performance')}
                                >
                                    Performance
                                </button>
                                <button
                                    className={`settings-toggle-btn ${settings.encoderPreset === 'balanced' ? 'active' : ''}`}
                                    onClick={() => handleChange('encoderPreset', 'balanced')}
                                >
                                    Balanced
                                </button>
                                <button
                                    className={`settings-toggle-btn ${settings.encoderPreset === 'quality' ? 'active' : ''}`}
                                    onClick={() => handleChange('encoderPreset', 'quality')}
                                >
                                    Quality
                                </button>
                            </div>
                            <span className="settings-hint">
                                {settings.encoderPreset === 'performance'
                                    ? 'Lowest GPU usage - similar to ShadowPlay. Recommended for gaming.'
                                    : settings.encoderPreset === 'balanced'
                                        ? 'Moderate GPU usage with improved visual quality.'
                                        : 'Highest quality but uses more GPU. Best for content creation.'}
                            </span>
                        </div>
                    </div>

                    <div className="settings-row">
                        <label>Video Bitrate</label>
                        <div className="settings-input-group">
                            {!isCustomBitrate ? (
                                <div className="settings-slider-container">
                                    <input
                                        type="range"
                                        min="1000"
                                        max="50000"
                                        step="1000"
                                        value={settings.videoBitrate}
                                        onChange={(e) => handleChange('videoBitrate', Number(e.target.value))}
                                    />
                                    <span className="settings-slider-value">
                                        {settings.videoBitrate >= 1000 ? `${(settings.videoBitrate / 1000).toFixed(0)} Mbps` : `${settings.videoBitrate} kbps`}
                                    </span>
                                    <button
                                        className="settings-toggle-btn"
                                        onClick={() => setIsCustomBitrate(true)}
                                        style={{ marginLeft: '10px', whiteSpace: 'nowrap' }}
                                    >
                                        Custom
                                    </button>
                                </div>
                            ) : (
                                <div className="settings-custom-duration-container" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        padding: '0 1rem',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <input
                                            type="number"
                                            min="500"
                                            value={settings.videoBitrate || ''}
                                            onChange={(e) => handleChange('videoBitrate', parseInt(e.target.value) || 0)}
                                            onBlur={() => {
                                                if (settings.videoBitrate < 500) handleChange('videoBitrate', 500);
                                            }}
                                            className="settings-number-input-custom"
                                            placeholder="kbps"
                                            style={{
                                                flex: 1,
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#f3f4f6',
                                                padding: '0.75rem 0',
                                                fontSize: '0.95rem',
                                                outline: 'none',
                                                width: '100%'
                                            }}
                                        />
                                        <span style={{ color: '#9ca3af', fontSize: '0.9rem', whiteSpace: 'nowrap', marginLeft: '10px', userSelect: 'none' }}>
                                            {(settings.videoBitrate / 1000).toFixed(1)} Mbps
                                        </span>
                                    </div>
                                    <button
                                        className="settings-toggle-btn active"
                                        onClick={() => {
                                            setIsCustomBitrate(false);
                                            // Clamp/Snap logic for returning to slider
                                            if (settings.videoBitrate > 50000) {
                                                handleChange('videoBitrate', 50000);
                                            } else if (settings.videoBitrate < 1000) {
                                                handleChange('videoBitrate', 1000);
                                            } else {
                                                // Round to nearest 1000 kbps
                                                handleChange('videoBitrate', Math.round(settings.videoBitrate / 1000) * 1000);
                                            }
                                        }}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        Slider
                                    </button>
                                </div>
                            )}
                            <span className="settings-hint">Higher bitrate = better quality, larger files</span>
                        </div>
                    </div>

                    <div className="settings-row">
                        <label>Recording Format</label>
                        <div className="settings-input-group">
                            <div className="settings-toggle-group">
                                {formatOptions.map(fmt => (
                                    <button
                                        key={fmt}
                                        className={`settings-toggle-btn ${settings.recordingFormat === fmt ? 'active' : ''}`}
                                        onClick={() => handleChange('recordingFormat', fmt)}
                                    >
                                        {fmt.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <span className="settings-hint">MP4 is most compatible, MKV supports more features</span>
                        </div>
                    </div>

                    <div className="settings-row">
                        <label>Resolution</label>
                        <div className="settings-input-group">
                            <div className="settings-resolution-pair">
                                {/* Capture Resolution */}
                                <div className="settings-resolution-wrapper">
                                    <div className="settings-resolution-label">
                                        <span className="resolution-type">📹 Capture Resolution</span>
                                    </div>
                                    <div className="settings-resolution-presets">
                                        {resolutionPresets.map(preset => (
                                            <button
                                                key={`capture-${preset}`}
                                                className={`settings-toggle-btn ${settings.captureResolution === preset ? 'active' : ''}`}
                                                onClick={() => handleChange('captureResolution', preset)}
                                            >
                                                {resolutionLabels[preset]}
                                            </button>
                                        ))}
                                    </div>
                                    {settings.captureResolution === 'custom' && (
                                        <div className="settings-resolution-custom-inputs">
                                            <input
                                                type="number"
                                                min="320"
                                                max="7680"
                                                value={settings.customCaptureResolution?.width || 1920}
                                                onChange={(e) => handleChange('customCaptureResolution', {
                                                    width: parseInt(e.target.value) || 1920,
                                                    height: settings.customCaptureResolution?.height || 1080
                                                })}
                                                placeholder="Width"
                                            />
                                            <span className="resolution-x">×</span>
                                            <input
                                                type="number"
                                                min="240"
                                                max="4320"
                                                value={settings.customCaptureResolution?.height || 1080}
                                                onChange={(e) => handleChange('customCaptureResolution', {
                                                    width: settings.customCaptureResolution?.width || 1920,
                                                    height: parseInt(e.target.value) || 1080
                                                })}
                                                placeholder="Height"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Output Resolution */}
                                <div className="settings-resolution-wrapper">
                                    <div className="settings-resolution-label">
                                        <span className="resolution-type">💾 Output Resolution</span>
                                    </div>
                                    <div className="settings-resolution-presets">
                                        {resolutionPresets.map(preset => (
                                            <button
                                                key={`output-${preset}`}
                                                className={`settings-toggle-btn ${settings.outputResolution === preset ? 'active' : ''}`}
                                                onClick={() => handleChange('outputResolution', preset)}
                                            >
                                                {resolutionLabels[preset]}
                                            </button>
                                        ))}
                                    </div>
                                    {settings.outputResolution === 'custom' && (
                                        <div className="settings-resolution-custom-inputs">
                                            <input
                                                type="number"
                                                min="320"
                                                max="7680"
                                                value={settings.customOutputResolution?.width || 1920}
                                                onChange={(e) => handleChange('customOutputResolution', {
                                                    width: parseInt(e.target.value) || 1920,
                                                    height: settings.customOutputResolution?.height || 1080
                                                })}
                                                placeholder="Width"
                                            />
                                            <span className="resolution-x">×</span>
                                            <input
                                                type="number"
                                                min="240"
                                                max="4320"
                                                value={settings.customOutputResolution?.height || 1080}
                                                onChange={(e) => handleChange('customOutputResolution', {
                                                    width: settings.customOutputResolution?.width || 1920,
                                                    height: parseInt(e.target.value) || 1080
                                                })}
                                                placeholder="Height"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="settings-hint">
                                Lower resolution = better performance. Output resolution affects final saved file size.
                            </span>
                        </div>
                    </div>
                </section>

                {/* Monitors Section */}
                <section className="settings-section">
                    <h2>Monitors</h2>
                    <div className="settings-row">
                        <label>Record Monitors</label>
                        <div className="settings-input-group">
                            {monitors.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {monitors.map(m => (
                                        <label key={m.id} className="settings-checkbox-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={!settings.enabledMonitors || settings.enabledMonitors.includes(m.index)}
                                                onChange={(e) => handleMonitorToggle(m.index, e.target.checked)}
                                                style={{ width: '18px', height: '18px', accentColor: '#f1d289' }}
                                            />
                                            <span style={{ fontSize: '0.95rem', color: '#f3f4f6' }}>
                                                Monitor {m.index + 1} ({m.width}x{m.height})
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>No monitors detected</div>
                            )}
                            <span className="settings-hint" style={{ marginTop: '8px', display: 'block' }}>
                                Uncheck monitors to exclude them from the Mega-Canvas recording.
                            </span>
                        </div>
                    </div>
                </section>

                {/* Output Section */}
                <section className="settings-section">
                    <h2>Output</h2>

                    <div className="settings-row">
                        <label>Save Location</label>
                        <div className="settings-input-group">
                            <div className="settings-path-input">
                                <input
                                    type="text"
                                    value={settings.recordingPath}
                                    readOnly
                                    className="settings-path-display"
                                />
                                <button onClick={handlePickFolder} className="settings-browse-btn">
                                    Browse...
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Audio Section */}
                <section className="settings-section">
                    <h2>Audio</h2>

                    <div className="settings-row">
                        <label>Desktop Audio</label>
                        <div className="settings-input-group">
                            <label className="settings-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.captureDesktopAudio}
                                    onChange={(e) => handleChange('captureDesktopAudio', e.target.checked)}
                                />
                                <span className="settings-switch-slider"></span>
                            </label>
                            <span className="settings-hint">Capture game and system audio</span>
                        </div>
                    </div>

                    <div className="settings-row">
                        <label>Microphone</label>
                        <div className="settings-input-group">
                            <label className="settings-switch">
                                <input
                                    type="checkbox"
                                    checked={settings.captureMicrophone}
                                    onChange={(e) => handleChange('captureMicrophone', e.target.checked)}
                                />
                                <span className="settings-switch-slider"></span>
                            </label>
                            <span className="settings-hint">Capture microphone audio</span>
                        </div>
                    </div>
                </section>

                {/* Hotkeys Section */}
                <section className="settings-section">
                    <h2>Hotkeys</h2>

                    {/* Main Save Replay Hotkey (shows overlay) */}
                    <div className="settings-row">
                        <label>Save Replay (Select Monitor)</label>
                        <div className="settings-input-group">
                            <div className="settings-hotkey-wrapper">
                                <input
                                    type="text"
                                    value={recordingHotkeyField === 'replayHotkey' ? "Press any key..." : settings.replayHotkey}
                                    readOnly
                                    className={`settings-hotkey-display ${recordingHotkeyField === 'replayHotkey' ? 'recording' : ''}`}
                                    onClick={() => setRecordingHotkeyField('replayHotkey')}
                                    onKeyDown={(e) => handleHotkeyKeyDown(e, 'replayHotkey')}
                                    onBlur={() => setRecordingHotkeyField(null)}
                                    placeholder="Click to set hotkey"
                                />
                                {recordingHotkeyField === 'replayHotkey' && (
                                    <div className="settings-hotkey-overlay" onClick={() => setRecordingHotkeyField(null)}>
                                        Tap to cancel
                                    </div>
                                )}
                            </div>
                            <span className="settings-hint">Shows monitor selection popup (for multi-monitor)</span>
                        </div>
                    </div>

                    {/* Monitor 1 Direct Save Hotkey */}
                    <div className="settings-row">
                        <label>Save Monitor 1</label>
                        <div className="settings-input-group">
                            <div className="settings-hotkey-wrapper">
                                <input
                                    type="text"
                                    value={recordingHotkeyField === 'monitor1Hotkey' ? "Press any key..." : (settings.monitor1Hotkey || '')}
                                    readOnly
                                    className={`settings-hotkey-display ${recordingHotkeyField === 'monitor1Hotkey' ? 'recording' : ''}`}
                                    onClick={() => setRecordingHotkeyField('monitor1Hotkey')}
                                    onKeyDown={(e) => handleHotkeyKeyDown(e, 'monitor1Hotkey')}
                                    onBlur={() => setRecordingHotkeyField(null)}
                                    placeholder="Click to set hotkey"
                                />
                                {recordingHotkeyField === 'monitor1Hotkey' && (
                                    <div className="settings-hotkey-overlay" onClick={() => setRecordingHotkeyField(null)}>
                                        Tap to cancel
                                    </div>
                                )}
                            </div>
                            <span className="settings-hint">Instantly save only Monitor 1 (no popup)</span>
                        </div>
                    </div>

                    {/* Monitor 2 Direct Save Hotkey */}
                    <div className="settings-row">
                        <label>Save Monitor 2</label>
                        <div className="settings-input-group">
                            <div className="settings-hotkey-wrapper">
                                <input
                                    type="text"
                                    value={recordingHotkeyField === 'monitor2Hotkey' ? "Press any key..." : (settings.monitor2Hotkey || '')}
                                    readOnly
                                    className={`settings-hotkey-display ${recordingHotkeyField === 'monitor2Hotkey' ? 'recording' : ''}`}
                                    onClick={() => setRecordingHotkeyField('monitor2Hotkey')}
                                    onKeyDown={(e) => handleHotkeyKeyDown(e, 'monitor2Hotkey')}
                                    onBlur={() => setRecordingHotkeyField(null)}
                                    placeholder="Click to set hotkey"
                                />
                                {recordingHotkeyField === 'monitor2Hotkey' && (
                                    <div className="settings-hotkey-overlay" onClick={() => setRecordingHotkeyField(null)}>
                                        Tap to cancel
                                    </div>
                                )}
                            </div>
                            <span className="settings-hint">Instantly save only Monitor 2 (no popup)</span>
                        </div>
                    </div>

                    {/* All Monitors Direct Save Hotkey */}
                    <div className="settings-row">
                        <label>Save Both Monitors</label>
                        <div className="settings-input-group">
                            <div className="settings-hotkey-wrapper">
                                <input
                                    type="text"
                                    value={recordingHotkeyField === 'allMonitorsHotkey' ? "Press any key..." : (settings.allMonitorsHotkey || '')}
                                    readOnly
                                    className={`settings-hotkey-display ${recordingHotkeyField === 'allMonitorsHotkey' ? 'recording' : ''}`}
                                    onClick={() => setRecordingHotkeyField('allMonitorsHotkey')}
                                    onKeyDown={(e) => handleHotkeyKeyDown(e, 'allMonitorsHotkey')}
                                    onBlur={() => setRecordingHotkeyField(null)}
                                    placeholder="Click to set hotkey"
                                />
                                {recordingHotkeyField === 'allMonitorsHotkey' && (
                                    <div className="settings-hotkey-overlay" onClick={() => setRecordingHotkeyField(null)}>
                                        Tap to cancel
                                    </div>
                                )}
                            </div>
                            <span className="settings-hint">Instantly save both monitors as separate files (no popup)</span>
                        </div>
                    </div>

                    {/* Buffer Toggle Hotkey */}
                    <div className="settings-row">
                        <label>Toggle Buffer</label>
                        <div className="settings-input-group">
                            <div className="settings-hotkey-wrapper">
                                <input
                                    type="text"
                                    value={recordingHotkeyField === 'bufferToggleHotkey' ? "Press any key..." : (settings.bufferToggleHotkey || '')}
                                    readOnly
                                    className={`settings-hotkey-display ${recordingHotkeyField === 'bufferToggleHotkey' ? 'recording' : ''}`}
                                    onClick={() => setRecordingHotkeyField('bufferToggleHotkey')}
                                    onKeyDown={(e) => handleHotkeyKeyDown(e, 'bufferToggleHotkey')}
                                    onBlur={() => setRecordingHotkeyField(null)}
                                    placeholder="Click to set hotkey"
                                />
                                {recordingHotkeyField === 'bufferToggleHotkey' && (
                                    <div className="settings-hotkey-overlay" onClick={() => setRecordingHotkeyField(null)}>
                                        Tap to cancel
                                    </div>
                                )}
                            </div>
                            <span className="settings-hint">Pause or resume the replay buffer</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Settings;
