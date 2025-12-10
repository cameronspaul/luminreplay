import { useState, useEffect } from 'react'
import Overlay from './components/Overlay'
import Settings from './components/Settings'
import ClipNotification from './components/ClipNotification'
import './App.css'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [bufferActive, setBufferActive] = useState(true)

  // Load initial buffer state
  useEffect(() => {
    const loadBufferStatus = async () => {
      try {
        // @ts-ignore
        const status = await window.electronAPI.getBufferStatus()
        setBufferActive(status)
      } catch (e) {
        console.error('Failed to get buffer status:', e)
      }
    }
    loadBufferStatus()
  }, [])

  // Simple router based on query param
  const urlParams = new URLSearchParams(window.location.search);
  const showOverlay = urlParams.get('overlay') === 'true';
  const notificationType = urlParams.get('notification') as 'recorded' | 'saved' | 'buffer-on' | 'buffer-off' | null;

  if (notificationType) {
    return <ClipNotification type={notificationType} />;
  }

  if (showOverlay) {
    return <Overlay />;
  }

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />;
  }

  const handleToggleBuffer = async () => {
    try {
      // @ts-ignore
      const newStatus = await window.electronAPI.toggleBuffer()
      setBufferActive(newStatus)
    } catch (e) {
      console.error('Failed to toggle buffer:', e)
    }
  }

  return (
    <div className="main-container">
      <div className="main-content">
        <div className="logo-section">
          <img src="/lumin.svg" alt="LuminReplay Logo" className="logo-icon" />
          <h1 className="app-title">Lumin<span>Replay</span></h1>
          <p className="app-subtitle">Multi-Monitor Replay Buffer</p>
        </div>

        <div className={`status-card ${bufferActive ? '' : 'paused'}`} onClick={handleToggleBuffer} style={{ cursor: 'pointer' }}>
          <div className={`status-indicator ${bufferActive ? 'active' : 'inactive'}`}></div>
          <div className="status-text">
            <span className="status-label">Replay Buffer</span>
            <span className="status-value">{bufferActive ? 'Active - Monitoring' : 'Paused'}</span>
          </div>
          <i className={`ph ${bufferActive ? 'ph-broadcast' : 'ph-pause-circle'}`} style={{ fontSize: '1.5rem', color: bufferActive ? 'var(--gold-light)' : 'var(--text-muted)', opacity: 0.8 }}></i>
        </div>
        <div className="button-group">
          <button
            className="primary-button"
            disabled={!bufferActive}
            onClick={() => {
              // @ts-ignore
              window.electronAPI.saveReplay()
            }}
          >
            <i className="ph ph-floppy-disk" style={{ marginRight: '8px' }}></i>
            Save Replay
          </button>
          <button
            className={`toggle-button ${bufferActive ? 'active' : 'inactive'}`}
            onClick={handleToggleBuffer}
          >
            <i className={`ph ${bufferActive ? 'ph-pause' : 'ph-play'}`} style={{ marginRight: '8px' }}></i>
            {bufferActive ? 'Pause Buffer' : 'Resume Buffer'}
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


