import React, { useEffect, useState } from 'react';
import './Settings.css';

interface AppSettings {
    replayBufferDuration: number;
    replayBufferMaxSize: number;
    videoBitrate: number;
    fps: number;
    recordingFormat: 'mp4' | 'mkv' | 'flv';
    recordingPath: string;
    captureDesktopAudio: boolean;
    captureMicrophone: boolean;
    replayHotkey: string;
    enabledMonitors?: number[];
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

    const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);

    // Initialize custom mode based on loaded settings
    useEffect(() => {
        if (settings) {
            // If duration is > 3 minutes (180s) or not a multiple of 10, default to custom mode
            if (settings.replayBufferDuration > 180 || settings.replayBufferDuration % 10 !== 0) {
                setIsCustomDuration(true);
            }
            // If bitrate is > 60000 (60 Mbps) or not a multiple of 1000, default to custom mode
            if (settings.videoBitrate > 60000 || settings.videoBitrate % 1000 !== 0) {
                setIsCustomBitrate(true);
            }
        }
    }, [loading]); // Run check when loading completes

    // Preset options
    const fpsOptions = [30, 60, 120];


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

    const handleHotkeyKeyDown = (e: React.KeyboardEvent) => {
        if (!isRecordingHotkey) return;

        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
            setIsRecordingHotkey(false);
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
        handleChange('replayHotkey', hotkey);
        setIsRecordingHotkey(false);
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
                <h1>Settings</h1>
            </div>

            <div className="settings-content">
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
                        <label>Video Bitrate</label>
                        <div className="settings-input-group">
                            {!isCustomBitrate ? (
                                <div className="settings-slider-container">
                                    <input
                                        type="range"
                                        min="1000"
                                        max="60000"
                                        step="1000"
                                        value={Math.min(settings.videoBitrate, 60000)}
                                        onChange={(e) => handleChange('videoBitrate', Number(e.target.value))}
                                    />
                                    <span className="settings-slider-value">
                                        {(settings.videoBitrate / 1000).toFixed(0)} Mbps
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
                                            min="1000"
                                            value={settings.videoBitrate || ''}
                                            onChange={(e) => handleChange('videoBitrate', parseInt(e.target.value) || 0)}
                                            onBlur={() => {
                                                if (settings.videoBitrate < 1000) handleChange('videoBitrate', 1000);
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
                                            if (settings.videoBitrate > 60000) {
                                                handleChange('videoBitrate', 60000);
                                            } else if (settings.videoBitrate < 1000) {
                                                handleChange('videoBitrate', 1000);
                                            } else {
                                                // Round to nearest 1000
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
                                                style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
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

                {/* Hotkey Section */}
                <section className="settings-section">
                    <h2>Hotkey</h2>

                    <div className="settings-row">
                        <label>Save Replay</label>
                        <div className="settings-input-group">
                            <div className="settings-hotkey-wrapper">
                                <input
                                    type="text"
                                    value={isRecordingHotkey ? "Press any key..." : settings.replayHotkey}
                                    readOnly
                                    className={`settings-hotkey-display ${isRecordingHotkey ? 'recording' : ''}`}
                                    onClick={() => setIsRecordingHotkey(true)}
                                    onKeyDown={handleHotkeyKeyDown}
                                    onBlur={() => setIsRecordingHotkey(false)}
                                    placeholder="Click to set hotkey"
                                />
                                {isRecordingHotkey && (
                                    <div className="settings-hotkey-overlay" onClick={() => setIsRecordingHotkey(false)}>
                                        Tap to cancel
                                    </div>
                                )}
                            </div>
                            <span className="settings-hint">Click to record a new hotkey (e.g. Alt+F10)</span>
                        </div>
                    </div>
                </section>
            </div>

            <div className="settings-footer">
                <button onClick={handleReset} className="settings-reset-btn">
                    Reset to Defaults
                </button>
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className={`settings-save-btn ${hasChanges ? 'has-changes' : ''}`}
                >
                    {saving ? 'Saving...' : hasChanges ? 'Save & Apply' : 'Saved'}
                </button>
            </div>
        </div>
    );
};

export default Settings;
