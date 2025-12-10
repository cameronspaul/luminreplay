import { useState } from 'react'
import Overlay from './components/Overlay'
import reactLogo from './assets/react.svg'
import viteLogo from '/electron-vite.animate.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  // Simple router based on query param
  const urlParams = new URLSearchParams(window.location.search);
  const showOverlay = urlParams.get('overlay') === 'true';

  if (showOverlay) {
    // Lazy load or just render Overlay
    // We need to import it. 
    // Since this tool replaces content, I should add import at top too.
    // Wait, replace_file_content is for contiguous block.
    // I need to use multi_replace to add import.
    return <Overlay />;
  }

  return (
    <>
      <div>
        <a href="https://electron-vite.github.io" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>ShadowPlay Clone</h1>
      <div className="card">
        <p>
          Press Alt+F10 to save replay.
        </p>
      </div>
    </>
  )
}

export default App
