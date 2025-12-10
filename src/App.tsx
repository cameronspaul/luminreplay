import { useState } from 'react'
import Overlay from './components/Overlay'
import Settings from './components/Settings'
import './App.css'

function App() {
  const [showSettings, setShowSettings] = useState(false)

  // Simple router based on query param
  const urlParams = new URLSearchParams(window.location.search);
  const showOverlay = urlParams.get('overlay') === 'true';

  if (showOverlay) {
    return <Overlay />;
  }

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="main-container">
      <div className="main-content">
        <div className="logo-section">
          <div className="logo-icon"></div>
          <h1 className="app-title">LuminReplay</h1>
          <p className="app-subtitle">Multi-Monitor Replay Buffer</p>
        </div>

        <div className="status-card">
          <div className="status-indicator active"></div>
          <div className="status-text">
            <span className="status-label">Replay Buffer</span>
            <span className="status-value">Active</span>
          </div>
        </div>

        <div className="hotkey-card">
          <div className="hotkey-icon"></div>
          <div className="hotkey-info">
            <span className="hotkey-label">Save Replay</span>
            <kbd className="hotkey-key">Alt + F10</kbd>
          </div>
        </div>

        <p className="info-text">
          Press the hotkey to save the last few seconds of your screen.
          <br />
          You'll be able to choose which monitor to save.
        </p>

        <button
          className="settings-button"
          onClick={() => setShowSettings(true)}
        >
          Settings
        </button>
      </div>
    </div>
  )
}

export default App

