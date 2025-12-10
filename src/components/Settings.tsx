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
}

const Settings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Preset options
    const fpsOptions = [30, 60, 120];
    const bitratePresets = [
        { label: 'Low (6 Mbps)', value: 6000 },
        { label: 'Medium (12 Mbps)', value: 12000 },
        { label: 'High (20 Mbps)', value: 20000 },
        { label: 'Ultra (50 Mbps)', value: 50000 },
    ];
    const durationPresets = [15, 30, 60, 120, 300];
    const formatOptions = ['mp4', 'mkv', 'flv'] as const;

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            // @ts-ignore
            const s = await window.electronAPI?.getSettings();
            setSettings(s);
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

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            // @ts-ignore
            await window.electronAPI?.setSettings(settings);
            // Restart OBS with new settings
            // @ts-ignore
            await window.electronAPI?.restartOBS();
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
                            <select
                                value={settings.replayBufferDuration}
                                onChange={(e) => handleChange('replayBufferDuration', Number(e.target.value))}
                            >
                                {durationPresets.map(d => (
                                    <option key={d} value={d}>
                                        {d >= 60 ? `${d / 60} minute${d > 60 ? 's' : ''}` : `${d} seconds`}
                                    </option>
                                ))}
                            </select>
                            <span className="settings-hint">How far back the replay buffer saves</span>
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
                            <select
                                value={settings.videoBitrate}
                                onChange={(e) => handleChange('videoBitrate', Number(e.target.value))}
                            >
                                {bitratePresets.map(b => (
                                    <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                            </select>
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
                            <input
                                type="text"
                                value={settings.replayHotkey}
                                readOnly
                                className="settings-hotkey-display"
                            />
                            <span className="settings-hint">Hotkey to save replay (editable in future update)</span>
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
