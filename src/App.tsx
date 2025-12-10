import { useState } from 'react'
import Overlay from './components/Overlay'
import Settings from './components/Settings'
import ClipNotification from './components/ClipNotification'
import './App.css'

function App() {
  const [showSettings, setShowSettings] = useState(false)

  // Simple router based on query param
  const urlParams = new URLSearchParams(window.location.search);
  const showOverlay = urlParams.get('overlay') === 'true';
  const notificationType = urlParams.get('notification') as 'recorded' | 'saved' | null;

  if (notificationType) {
    return <ClipNotification type={notificationType} />;
  }

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
          <img src="/lumin.svg" alt="LuminReplay Logo" className="logo-icon" />
          <h1 className="app-title">Lumin<span>Replay</span></h1>
          <p className="app-subtitle">Multi-Monitor Replay Buffer</p>
        </div>

        <div className="status-card">
          <div className="status-indicator active"></div>
          <div className="status-text">
            <span className="status-label">Replay Buffer</span>
            <span className="status-value">Active - Monitoring</span>
          </div>
          <i className="ph ph-broadcast" style={{ fontSize: '1.5rem', color: 'var(--gold-light)', opacity: 0.8 }}></i>
        </div>
        <div className="button-group">
          <button
            className="primary-button"
            onClick={() => {
              // @ts-ignore
              window.electronAPI.saveReplay()
            }}
          >
            <i className="ph ph-floppy-disk" style={{ marginRight: '8px' }}></i>
            Save Replay
          </button>
          <button
            className="secondary-button"
            onClick={() => setShowSettings(true)}
          >
            <i className="ph ph-gear" style={{ marginRight: '8px' }}></i>
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default App

