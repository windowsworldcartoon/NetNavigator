# NetNavigator v1.1.0
Welcome to NetNavigator - A comprehensive Network Utility for Windows, Linux, and MacOS

# Table of Contents
- [Introduction](#netnavigator)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [System Requirements](#system-requirements)
- [Contributing](#contributing)

## Features

### Network Tools
- **Network Scanner** - Discover devices on your local network
- **Port Checker** - Check if ports are open on a host
- **DNS Lookup** - Resolve domain names with multiple record types
- **Network Monitor** - Monitor real-time network activity

### Advanced Features
- **Packet & Traffic Analysis** - Capture and analyze network packets in real-time
  - Protocol distribution tracking
  - Top connections monitoring
  - Traffic statistics
  - Packet table with detailed information
- **Diagnostics** - System and network diagnostic information
  - System information (Platform, CPU, Memory, Uptime)
  - Network interfaces and IP information
  - Application versions (Node.js, Electron)
- **Network Info** - View detailed network configuration
- **Network Optimization** - Optimize network settings for better performance

### UI/UX
- Modern, intuitive interface with dark/light theme support
- Sidebar navigation with favorites
- Command palette for quick access
- Real-time status indicators
- Responsive design

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
2. **Scanner** - Enter a base IP to scan your network
3. **Port Checker** - Check specific ports on hosts
4. **DNS Lookup** - Resolve domains and query DNS records
5. **Packet Analysis** - Start capturing network packets in real-time
6. **Diagnostics** - View system and network diagnostic information
7. **Network Info** - Get detailed network configuration
8. **Monitor** - Monitor real-time network activity
9. **Optimize** - Run network optimization tools

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
