# LuminReplay

LuminReplay is an Electron + React desktop app that runs a ShadowPlay-style replay buffer across multiple monitors using `obs-studio-node`. It captures a mega-canvas of all connected displays, lets you pick which view to save, and splits/crops recordings per monitor with `ffmpeg`. A tray UI, global hotkeys, and in-app settings keep the workflow fast while keeping GPU/CPU load low (NVENC by default).

## Features
- Multi-monitor capture with per-monitor saves or “save all” splitting.
- Global hotkeys for main overlay, per-monitor quick saves, and buffer toggle (defaults: Alt+F10 main, Alt+F11/Alt+F12 per-monitor, Alt+Delete all, Alt+F9 toggle).
- Replay buffer controls, notifications, and tray menu with quick actions.
- Settings for buffer length/size, bitrate, encoder (NVENC or x264), FPS, capture/output resolution (native/presets/custom), audio sources, formats, save path, and enabled monitors.

## Demo
[![Watch the Demo](docs/public/lumin.png)](docs/public/example.mp4)

> **Note:** Click the image above to watch the demo video. You can also view it on our [website](https://cameronpaul.github.io/luminreplay/).


## Requirements
- Node.js 18+ and npm.
- Platform prerequisites for `obs-studio-node` (e.g., VC++ Redistributable on Windows; GPU drivers for NVENC). The app will prompt to install VC++ if OBS cannot load.
- `ffmpeg` available on PATH for post-processing crops when saving per monitor (used by `fluent-ffmpeg`).

## Getting Started
```bash
npm install
npm run dev        # Starts Vite + Electron in development
```
The Vite dev server serves the renderer; `vite-plugin-electron` builds/launches the main and preload processes alongside it.

### Lint
```bash
npm run lint
```

### Production Build / Installer
```bash
npm run build      # tsc + vite build + electron-builder
```
Packages are written to `release/<version>` based on `electron-builder.json5` (nsis for Windows, dmg for macOS, AppImage for Linux).

## Using the App
- Tray: click the tray icon to open settings; context menu shows buffer state, toggle, save replay, open recordings folder, and quit.
- Main window: toggle replay buffer, save replay, and open Settings.
- Overlay: pressing the main hotkey shows a monitor picker; choose a display or “Save All” to split outputs per monitor.
- Direct saves: per-monitor/all hotkeys bypass the overlay and crop in the background.
- Settings: adjust video quality, resolutions, audio, hotkeys, monitors to record, and save location. Use “Reset Defaults” to revert while keeping the current recording path. Saving restarts OBS and rebinds hotkeys.

## Project Structure
- `src/` — React renderer (App UI, settings, overlay, notifications).
- `electron/main.ts` — Electron bootstrap, tray, windows, hotkeys, IPC.
- `electron/obs.ts` — OBS integration, replay buffer control, monitor-aware splitting with ffmpeg.
- `electron/settings.ts` — Settings persistence (JSON in user data) and IPC.
- `electron/preload.ts` — Safe IPC bridge (`window.electronAPI`).
- `public/` — Static assets (icons, logos).

## Troubleshooting
- OBS engine failed to load: install the VC++ Redistributable (Windows) or platform-specific dependencies for `obs-studio-node`, then restart.
- ffmpeg not found: install ffmpeg and ensure it is on PATH so `fluent-ffmpeg` can crop/split recordings.
- Hotkeys not registering: ensure the key combos are free; saving settings re-registers all shortcuts.
