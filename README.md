# LuminReplay

A desktop application that provides LuminReplay-like functionality for screen recording with multi-monitor replay buffer support. Built with Electron, React, and OBS Studio.

## Features

- **Multi-Monitor Support**: Capture and save replays from any connected monitor
- **System Tray Integration**: Runs quietly in the background with easy access
- **Hotkey Support**: Press `Alt + F10` to instantly save the last few seconds of gameplay
- **Overlay Interface**: Choose which monitor to save after triggering a replay
- **Customizable Settings**: Configure recording path, video quality, and more
- **OBS Studio Integration**: Leverages OBS Studio's powerful recording capabilities

## Requirements

- Windows (primary platform)
- OBS Studio installed on your system
- Node.js 18+ for development

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd luminreplay
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

## Usage

1. Launch the application - it will appear in your system tray

2. The replay buffer will automatically start recording
3. Press `Alt + F10` to save the last few seconds of your screen
4. An overlay will appear allowing you to select which monitor to save
5. Recordings are saved to your configured output directory

### System Tray Options

- **Save Replay (Alt+F10)**: Manually trigger replay save
- **Settings**: Open the settings window
- **Open Recordings Folder**: Browse your saved recordings
- **Quit**: Exit the application

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Project Structure

```
src/
├── components/     # React components
│   ├── Overlay.tsx # Monitor selection overlay
│   └── Settings.tsx # Settings interface
├── App.tsx         # Main application component
└── main.tsx        # React entry point

electron/
├── main.ts         # Electron main process
├── obs.ts          # OBS Studio integration
├── settings.ts     # Settings management
└── preload.ts      # Preload script
```

## Configuration

The application stores settings in a local configuration file. You can modify:

- Recording output path
- Video bitrate and quality
- Replay buffer length
- Hotkey configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is open source. See LICENSE file for details.