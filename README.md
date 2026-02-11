# NetNavigator v1.3.0
Welcome to NetNavigator - A comprehensive Network Utility for Windows, Linux, and MacOS

# Table of Contents
- [Introduction](#netnavigator)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [What's New](#whats-new-in-v130)
- [System Requirements](#system-requirements)
- [Contributing](#contributing)

## Features

### Network Tools
- **Network Scanner** - Discover devices on your local network with advanced filtering
- **Port Scanner** - Comprehensive port scanning with configurable ranges
- **Traceroute/Tracert** - Trace network paths with hop-by-hop analysis
- **DNS Lookup** - Resolve domain names with multiple record types
- **Network Monitor** - Monitor real-time network activity
- **Diagnostics** - System and network diagnostic information

### Advanced Features
- **Packet & Traffic Analysis** - Capture and analyze network packets in real-time
  - Protocol distribution tracking
  - Top connections monitoring
  - Traffic statistics
  - Packet table with detailed information
- **Theme Management System** - Dynamic theme switching with persistent configuration
  - Light/Dark mode auto-detection
  - Custom color overrides
  - Real-time theme application
- **Network Optimization** - Optimize network settings for better performance
- **Enhanced Export** - Export results as CSV with security safeguards

### UI/UX
- **Classic Design System (ND1-C)** - Flat, minimal aesthetic with professional styling
- Sidebar navigation with favorites
- Command palette for quick access
- Real-time status indicators
- Responsive design
- Animated welcome screen with particle network visualization

## What's New in v1.3.0

### Major Features
- **Traceroute/Tracert Tool** - New dedicated tab for network path tracing
- **Classic Design System (ND1-C)** - Completely redesigned UI with flat aesthetic
- **Enhanced Theme System** - Advanced theme management with custom colors and persistence
- **OS Integration** - Windows Jump List shortcuts and command-line argument handling
- **Animated Welcome Screen** - Particle network visualization with rotating globe

### UI/Design Updates
- Flat, minimal design aesthetic (reduced border radii: 2px-8px)
- Updated button variants with proper focus states
- Redesigned snackbar notifications
- Consistent color palette throughout
- Improved accessibility with keyboard navigation

### Tools & Performance
- CSV export for traceroute results
- Enhanced cross-platform compatibility
- Better IPC error handling
- Improved reliability

## Installation

### Download from GitHub Releases (Recommended)
1. Visit [GitHub Releases](https://github.com/windowsworldcartoon/NetNavigator/releases)
2. Download the latest version for your platform:
   - **Windows**: `NetNavigator-Setup-x64.exe`
   - **macOS (Intel)**: `NetNavigator-x64.dmg`
   - **macOS (Apple Silicon)**: `NetNavigator-arm64.dmg`
   - **Linux**: `NetNavigator-x64.AppImage` or `.deb`
3. Run the installer and follow the on-screen instructions
4. Launch NetNavigator

### Build from Source
```bash
git clone https://github.com/windowsworldcartoon/NetNavigator.git
cd NetNavigator
npm install
npm start
```

## Usage
After launching NetNavigator:
1. **Dashboard** - View quick overview of network status
2. **Network Scanner** - Enter a base IP to scan your network with filtering options
3. **Port Scanner** - Scan specific ports with configurable ranges and batch scanning
4. **Traceroute** - Trace network paths and analyze hop-by-hop latency
5. **DNS Lookup** - Resolve domains and query DNS records
6. **Packet Analysis** - Start capturing network packets in real-time
7. **Diagnostics** - View system and network diagnostic information
8. **Network Info** - Get detailed network configuration
9. **Monitor** - Monitor real-time network activity
10. **Optimize** - Run network optimization tools
11. **Settings** - Customize theme, colors, and preferences

## System Requirements
- **Windows**: Windows 7 or later
- **macOS**: macOS 10.13 or later
- **Linux**: Ubuntu 18.04 or equivalent
- **RAM**: 4GB minimum
- **Storage**: 200MB free space

## Technologies Used
- **Electron** v39.1.0 - Desktop application framework
- **Node.js** - Backend runtime
- **systeminformation** - System and network information
- **Tabler Icons** - UI icon set

## Building a Release
To create a production build:
```bash
npm run build
```

Installers will be generated in the `release/` directory.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
ISC - See LICENSE file for details

## Support
For issues, questions, or suggestions, please visit the [GitHub Issues](https://github.com/windowsworldcartoon/NetNavigator/issues) page.
