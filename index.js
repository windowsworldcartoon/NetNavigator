const { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme, shell } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
const net = require('net');
const { fsPromises } = require('fs');
const semver = require('semver');

const registeredCommands = new Set();
const activeServers = new Map();


ipcMain.on('minimize-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
});


ipcMain.on('maximize-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
});


function checkInternetConnection() {
    return new Promise((resolve, reject) => {
        dns.lookup('github.com', (err) => {
            if (err && err.code === 'ENOTFOUND') {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    })
}



const menuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'New Window',
                accelerator: process.platform === 'darwin' ? 'Cmd+N' : 'Ctrl+N',
                click: () => {
                    createWindow();
                }
            },
            {
                label: 'Open Settings',
                accelerator: process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) {
                        win.webContents.send('switch-tab', 'settings');
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Exit',
                accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                click: () => {
                    app.quit();
                }
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { type: 'separator' },
            { role: 'selectAll' }
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                label: 'Appearance',
                submenu: [
                    {
                        label: '🌙 Light Mode',
                        click: () => {
                            nativeTheme.themeSource = 'light';
                            const win = BrowserWindow.getFocusedWindow();
                            if (win) {
                                win.webContents.send('theme-mode-changed', 'light');
                            }
                        }
                    },
                    {
                        label: '🌙 Dark Mode',
                        click: () => {
                            nativeTheme.themeSource = 'dark';
                            const win = BrowserWindow.getFocusedWindow();
                            if (win) {
                                win.webContents.send('theme-mode-changed', 'dark');
                            }
                        }
                    },
                    {
                        label: '💻 System Default',
                        click: () => {
                            nativeTheme.themeSource = 'system';
                            const win = BrowserWindow.getFocusedWindow();
                            if (win) {
                                win.webContents.send('theme-mode-changed', 'system');
                            }
                        }
                    }
                ]
            },
            { type: 'separator' },
            { role: 'reload' },
            { role: 'forceReload' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
            { type: 'separator' },
            {
                label: 'Toggle DevTools',
                accelerator: 'F12',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) {
                        const devtoolsWin = new BrowserWindow({
                            width: 800,
                            height: 600,
                            title: 'NetNavigator - DevTools',
                            autoHideMenuBar: true,
                            icon: path.join(__dirname, 'public', process.platform === 'win32' ? 'favicon.ico' : 'network.png'),
                            webPreferences: { nodeIntegration: true, contextIsolation: false }
                        });
                        win.webContents.setDevToolsWebContents(devtoolsWin.webContents);
                        win.webContents.openDevTools({ mode: 'detach' });
                    }
                }
            }
        ]
    },
    {
        label: 'Window',
        submenu: [
            {
                label: 'Minimize',
                accelerator: process.platform === 'darwin' ? 'Cmd+M' : 'Ctrl+M',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.minimize();
                }
            },
            {
                label: 'Maximize',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) {
                        if (win.isMaximized()) {
                            win.unmaximize();
                        } else {
                            win.maximize();
                        }
                    }
                }
            },
            { role: 'close' }
        ]
    },
    {
        label: 'Tools',
        submenu: [
            {
                label: 'Network Scanner',
                accelerator: 'Ctrl+Shift+S',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'scanner');
                }
            },
            {
                label: 'Port Scanner',
                accelerator: 'Ctrl+Shift+P',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'port');
                }
            },
            {
                label: 'Traceroute',
                accelerator: 'Ctrl+Shift+T',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'tracert');
                }
            },
            {
                label: 'DNS Resolver',
                accelerator: 'Ctrl+Shift+D',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'dns');
                }
            },
            { type: 'separator' },
            {
                label: 'Network Info',
                accelerator: 'Ctrl+Shift+I',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'info');
                }
            },
            {
                label: 'Server Manager',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'server-maker');
                }
            },
            { type: 'separator' },
            {
                label: 'Network Monitor',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'monitor');
                }
            },
            {
                label: 'Packet Analysis',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'packet-analysis');
                }
            },
            { type: 'separator' },
            {
                label: 'Network Optimization',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'optimize');
                }
            },
            {
                label: 'Diagnostics',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) win.webContents.send('switch-tab', 'diagnostics');
                }
            }
        ]
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'About NetNavigator',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    dialog.showMessageBox(win, {
                        type: 'info',
                        title: 'About NetNavigator',
                        message: 'NetNavigator ' + app.getVersion(),
                        detail: 'A powerful network scanning and monitoring tool for system administrators and developers.\n\nView more information on GitHub?',
                        buttons: ['Open GitHub', 'Close']
                    }).then(result => {
                        if (result.response === 0) {
                            shell.openExternal('https://github.com/windowsworldcartoon/NetNavigator');
                        }
                    });
                }
            },
            {
                label: 'Documentation',
                click: () => {
                    shell.openExternal('https://github.com/windowsworldcartoon/NetNavigator#readme');
                }
            },
            {
                label: 'Report Issue',
                click: () => {
                    shell.openExternal('https://github.com/windowsworldcartoon/NetNavigator/issues');
                }
            },
            { type: 'separator' },
            {
                label: 'Check for Updates',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) {
                       win.webContents.send('check-for-updates');
                    }
                }
            }
        ]
    }
];

async function createWindow() {
    const homedir = os.homedir();

    const publicPath = path.join(__dirname, 'public');
    const os1 = [
        {
            id: 'win32',
            name: 'Windows'
        },
        {
            id: 'darwin',
            name: 'MacOS'
        },
        {
            id: 'linux',
            name: 'Linux'
        },
        {
            id: 'freebsd',
            name: 'FreeBSD'
        },
        {
            id: 'openbsd',
            name: 'OpenBSD'
        },
        {
            id: 'sunos',
            name: 'SunOS'
        },
        {
            id: 'android',
            name: 'Android'
        }

    ]
    const win = new BrowserWindow({
        title: `NetNavigator (${os1.find(o => o.id === process.platform).name}) (${app.getVersion()})`,
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: false,
        icon: path.join(__dirname, 'public', process.platform === 'win32' ? 'favicon.ico' : 'network.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            spellcheck: true,
        },
    });

    // Handle JavaScript disabled error
    win.webContents.on('crashed', () => {
        console.error('Renderer process crashed');
        dialog.showErrorBox('Renderer Process Crashed', 'The application renderer process has crashed. Please restart the application.');
    });

    // Check if JavaScript is available when DOM is ready
    win.webContents.on('dom-ready', () => {
        // Verify JavaScript is working by executing a simple test
        win.webContents.executeJavaScript('window.jsEnabled = true;').catch(error => {
            console.error('JavaScript is not available:', error);
            dialog.showErrorBox('JavaScript Disabled', 'This application requires JavaScript to be enabled. Please enable JavaScript and restart the application.');
            win.close();
        });
    });

    win.loadFile(path.join(publicPath, 'index.html'));

    // Show window when ready
    win.once('ready-to-show', () => {
        win.show();
    });

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);


    if (process.platform === 'darwin') {
        app.dock.setIcon(path.join(__dirname, 'public', 'network.png'));
    }
    if (process.platform === 'win32') {
        app.setUserTasks([
            {
                program: process.execPath,
                arguments: '--new-window',
                iconPath: process.execPath,
                iconIndex: 0,
                title: 'New Window',
                description: 'Create a new window'
            },
            {
                program: process.execPath,
                arguments: '--open-network-scanner',
                iconPath: process.execPath,
                iconIndex: 0,
                title: 'Network Scanner',
                description: 'Quick access to Network Scanner'
            },
            {
                program: process.execPath,
                arguments: '--open-port-scanner',
                iconPath: process.execPath,
                iconIndex: 0,
                title: 'Port Scanner',
                description: 'Quick access to Port Scanner'
            },
            {
                program: process.execPath,
                arguments: '--open-traceroute',
                iconPath: process.execPath,
                iconIndex: 0,
                title: 'Traceroute',
                description: 'Quick access to Traceroute tool'
            },
            {
                program: process.execPath,
                arguments: '--run-diagnostics',
                iconPath: process.execPath,
                iconIndex: 0,
                title: 'Run Diagnostics',
                description: 'Run network diagnostics'
            }
        ])
    }

    const configPath = path.join(os.homedir(), '.netnavigator', 'config.json');
    const netdirPath = path.join(os.homedir(), '.netnavigator');
    console.log(configPath);

    try {
        if (!fs.existsSync(netdirPath)) {
            fs.mkdirSync(netdirPath);
        }

        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({}));
        } else {
            const configFileData = fs.readFileSync(configPath, 'utf8');
            const configData = JSON.parse(configFileData);

            if (Object.keys(configData).length === 0) {
                const newConfig = { name: 'NetNavigator', autoUpdate: false, loadExtensions: true };
                fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
            }
        }
    } catch (err) {
        console.error(err);
    }

    const contextMenu = Menu.buildFromTemplate([
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'cut' },
        { role: 'selectall' },
        { type: 'separator' },
        { label: 'Reload', accelerator: 'F5', click: () => win.reload() },
        { label: 'Force Reload', accelerator: 'Ctrl+F5', click: () => win.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { label: 'Toggle DevTools', accelerator: 'F12', click: () => win.webContents.toggleDevTools() },
        {
            label: 'Inspect Element', click: (menuItem, browserWindow, event) => {
                try {
                    const { x, y } = event;
                    win.webContents.inspectElement(x, y);
                } catch (e) {
                    console.error('Failed to inspect element', e);
                }
            }
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'close' },
    ]);

    const editMenu = Menu.buildFromTemplate([
        { role: 'copy' },
        { role: 'paste' },
        { role: 'cut' },
        { role: 'selectall' },
        { type: 'separator' },
        { role: 'undo' },
        { role: 'redo' }
    ]);

    ipcMain.on('open-folder', (event, data) => {
        dialog.showOpenDialog({
            properties: ['openDirectory']
        }).then(result => {
            if (result.filePaths[0] && result.canceled == false) {
                win.webContents.send('open-folder-result', { path: result.filePaths[0] });
            } else {
                win.webContents.send('open-folder-result', { canceled: true, info: 'No folder selected' });
            }
        })
    })
    try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (configData.autoUpdate === true) {
            ipcMain.emit('check-for-updates');
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Error parsing config file:', error);
            dialog.showMessageBox(win, {
                type: 'error',
                title: 'Error Parsing Config File',
                message: 'There was an error parsing the config file. Please check the file and try again.'
            })
        } else {
            console.error('Error reading config file:', error);
            dialog.showMessageBox(win, {
                type: 'error',
                title: 'Error Reading Config File',
                message: 'There was an error reading the config file. Please check the file and try again.'
            });
        }
    }

    win.webContents.on('context-menu', (e, params) => {
        e.preventDefault();
        if (!params.isEditable) {
            const customContextMenu = Menu.buildFromTemplate([
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'cut' },
                { role: 'selectall' },
                { type: 'separator' },
                { label: 'Reload', accelerator: 'F5', click: () => win.reload() },
                { label: 'Force Reload', accelerator: 'Ctrl+F5', click: () => win.webContents.reloadIgnoringCache() },
                { type: 'separator' },
                {
                    label: 'Toggle DevTools', accelerator: 'F12', click: () => {
                        const devToolsWin = new BrowserWindow({ width: 800, height: 600, title: 'NetNavigator - DevTools', autoHideMenuBar: true, icon: path.join(__dirname, 'public', process.platform === 'win32' ? 'favicon.ico' : 'network.png'), webPreferences: { nodeIntegration: true, contextIsolation: false } });
                        win.webContents.setDevToolsWebContents(devToolsWin.webContents);
                        win.webContents.openDevTools({ mode: 'detach' });
                    }
                },
                { label: 'Inspect Element', click: () => win.webContents.inspectElement(params.x, params.y) },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                { type: 'separator' },
                { role: 'minimize' },
                { role: 'close' },
            ]);
            customContextMenu.popup({ window: win });
        } else {
            editMenu.popup({ window: win });
        }
    });





    ipcMain.on('show-error', (event, data) => {
        dialog.showMessageBox(win, {
            type: data.type || 'error',
            title: data.title || 'NetNavigator - Error',
            message: data.message || 'An error occurred',
            buttons: data.buttons || ['OK']
        });
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });



}

ipcMain.handle('theme:toggle', async () => {
    if (nativeTheme.shouldUseDarkColors) {
        nativeTheme.themeSource = 'light';
    } else {
        nativeTheme.themeSource = 'dark';
    }
    return nativeTheme.themeSource;
});

ipcMain.handle('theme:system', async () => {
    nativeTheme.themeSource = 'system';
    return nativeTheme.themeSource;
});

ipcMain.handle('command-palette', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.webContents.send('show-command-palette');
    }
    return { success: true };
});



function checkConnectivity() {
    return new Promise((resolve) => {
        try {
            const timeoutId = setTimeout(() => {
                resolve(false);
            }, 5000);

            // Use DNS lookup to google.com as connectivity test
            dns.lookup('google.com', (err, address, family) => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        } catch (error) {
            console.error('Connectivity check exception:', error);
            resolve(false);
        }
    });

}
ipcMain.handle('netNav.checkConnectivity', async () => {
    return await checkConnectivity() ? true : false;
});

// Check if a port is listening
ipcMain.handle('check-port-listener', async (event, port) => {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve({ listening: true, port, protocol: 'TCP' });
            } else {
                resolve({ listening: false, port, protocol: 'TCP' });
            }
        });

        server.once('listening', () => {
            server.close();
            resolve({ listening: false, port, protocol: 'TCP' });
        });

        server.listen(port, '127.0.0.1');

        // Timeout after 1 second
        setTimeout(() => {
            server.close();
            resolve({ listening: false, port, protocol: 'TCP' });
        }, 1000);
    });
});

// Get listening processes
ipcMain.handle('get-listening-processes', async (event) => {
    return new Promise((resolve) => {
        try {
            const processes = [];
            const ports = [22, 80, 443, 3000, 3001, 3306, 5432, 5000, 8000, 8080, 8443, 9000, 27017, 6379, 5900, 21, 25, 53, 110, 143];

            // This is a simplified version - in production you'd use 'netstat' or similar
            resolve(processes);
        } catch (error) {
            resolve([]);
        }
    });
});

ipcMain.on('check-for-updates', () => {
    const win = BrowserWindow.getFocusedWindow();
    dns.lookup('github.com', (err, address, family) => {
        if (err) {
            dialog.showMessageBox(win, {
                type: 'error',
                title: 'NetNavigator - Error',
                message: 'There was an error checking for updates. Please check your internet connection and try again.'
            });
            return;
        }
    })
    const github = "https://api.github.com/repos/windowsworldcartoon/NetNavigator/releases/latest";
    fetch(github)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch updates ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data.tag_name === app.getVersion()) {
                dialog.showMessageBox(win, {
                    type: 'info',
                    title: 'NetNavigator - Update',
                    message: 'You are using the latest version of NetNavigator.'
                });
            } else {
                dialog.showMessageBox(win, {
                    type: 'info',
                    title: 'NetNavigator - Update',
                    message: 'A new version of NetNavigator is available.',
                    detail: `Version ${data.tag_name} is available.`,
                    buttons: ['Update', 'Cancel']
                }).then(result => {
                    if (result.response === 0) {

                    } else {
                        dialog.showMessageBox(win, {
                            type: 'info',
                            title: 'NetNavigator - Update',
                            message: 'Update canceled.'
                        });
                    }
                })
            }
        })
        .catch(error => {
            dialog.showMessageBox(win, {
                type: 'error',
                title: 'NetNavigator - Error',
                message: 'Failed to check for updates',
                detail: error.message,
                buttons: ['OK']
            })
        })
});

ipcMain.handle('updates-json', async () => {
    const github = "https://api.github.com/repos/windowsworldcartoon/NetNavigator/releases/latest";
    const response = await fetch(github);
    const data = await response.json();
    if (response.ok) {
        return { ...data, version: app.getVersion() };
    } else {
        throw new Error('Failed to fetch updates ' + response.status);
    }
});


ipcMain.handle('create-server', async (event, data) => {
    const { spawn } = require('child_process');

    // Validate input
    if (!data || !data.name || !data.port) {
        throw new Error('Invalid server configuration: name and port are required');
    }

    const homedir = os.homedir();
    const workspacePath = path.join(homedir, '.netnavigator', 'workspaces');

    if (!workspacePath) {
        throw new Error('Failed to determine workspace path');
    }

    const serverPath = path.join(workspacePath, data.name);
    const serverConfig = {
        name: data.name,
        port: data.port,
        type: data.type || 'http',
        createdAt: new Date().toISOString(),
        status: 'starting'
    };

    // Check if server already exists and is running
    if (activeServers.has(data.name)) {
        throw new Error('Server is already running');
    }

    if (!fs.existsSync(serverPath)) {
        await fsPromises.mkdir(serverPath, { recursive: true });
    }

    await fsPromises.writeFile(path.join(serverPath, 'config.json'), JSON.stringify(serverConfig, null, 2));

    const jsServer = `
const http = require('http');
const hostname = 'localhost';
const port = ${data.port};

const server = http.createServer((req, res) => {
   if (req.url === '/') {
       res.statusCode = 200;
       res.setHeader('Content-Type', 'text/plain');
       res.end('Hello World');
   } else if (req.url === '/test') {
       res.statusCode = 200;
       res.setHeader('Content-Type', 'text/plain');
       res.end('Test');
   } else if (req.url === '/api') {
       res.statusCode = 200;
       res.setHeader('Content-Type', 'application/json');
       res.end(JSON.stringify({ message: 'Hello World' }));
   } else {
       res.statusCode = 404;
       res.setHeader('Content-Type', 'text/plain');
       res.end('Not Found');
   }
});

server.listen(port, hostname, () => {
     console.log(\`Server running at http://\${hostname}:\${port}/\`);
});

process.on('SIGTERM', () => {
     console.log('SIGTERM signal received: closing HTTP server');
     server.close(() => {
          console.log('HTTP server closed');
     });
});
`;

    await fsPromises.writeFile(path.join(serverPath, 'server.js'), jsServer);

    // Spawn the server process
    const serverProcess = spawn('node', ['server.js'], {
        cwd: serverPath,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    // Capture stdout
    serverProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[${data.name}] stdout:`, chunk);
        // Send to renderer
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            win.webContents.send('server-output', data.name, 'stdout', chunk);
        }
    });

    // Capture stderr
    serverProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log(`[${data.name}] stderr:`, chunk);
        // Send to renderer
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            win.webContents.send('server-output', data.name, 'stderr', chunk);
        }
    });

    // Handle process exit
    serverProcess.on('exit', (code, signal) => {
        console.log(`Server ${data.name} exited with code ${code} and signal ${signal}`);
        activeServers.delete(data.name);
        // Send exit notification
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            win.webContents.send('server-exited', data.name, code, signal);
        }
    });

    // Store the process
    activeServers.set(data.name, {
        process: serverProcess,
        config: serverConfig,
        startTime: new Date(),
        stdout,
        stderr
    });

    return {
        success: true,
        message: 'Server created and started successfully',
        serverId: data.name,
        config: serverConfig
    };
});

// Stop server handler
ipcMain.handle('stop-server', async (event, serverName) => {
    if (!activeServers.has(serverName)) {
        throw new Error(`Server '${serverName}' is not running`);
    }

    const serverData = activeServers.get(serverName);
    const { process: serverProcess } = serverData;

    return new Promise((resolve, reject) => {
        // Give the process 5 seconds to shut down gracefully
        const timeout = setTimeout(() => {
            serverProcess.kill('SIGKILL');
            resolve({ success: true, message: 'Server forcefully stopped' });
        }, 5000);

        serverProcess.on('exit', () => {
            clearTimeout(timeout);
            activeServers.delete(serverName);
            resolve({ success: true, message: 'Server stopped successfully' });
        });

        // Send SIGTERM for graceful shutdown
        serverProcess.kill('SIGTERM');
    });
});

// Get server status handler
ipcMain.handle('get-server-status', async (event, serverName) => {
    if (!activeServers.has(serverName)) {
        return {
            running: false,
            message: `Server '${serverName}' is not running`
        };
    }

    const serverData = activeServers.get(serverName);
    return {
        running: true,
        name: serverData.config.name,
        port: serverData.config.port,
        type: serverData.config.type,
        createdAt: serverData.config.createdAt,
        uptime: Date.now() - serverData.startTime.getTime(),
        pid: serverData.process.pid,
        stdout: serverData.stdout,
        stderr: serverData.stderr
    };
});

// Get all active servers
ipcMain.handle('get-active-servers', async (event) => {
    const servers = [];
    for (const [name, data] of activeServers.entries()) {
        servers.push({
            name,
            port: data.config.port,
            type: data.config.type,
            createdAt: data.config.createdAt,
            uptime: Date.now() - data.startTime.getTime(),
            pid: data.process.pid
        });
    }
    return servers;
})


ipcMain.handle('exec', async (event, command) => {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) reject({ error, stdout, stderr });
            else resolve({ stdout, stderr });
        });
    });
});

ipcMain.handle('dns-lookup', async (event, options) => {
    const dnsPromises = require('dns').promises;
    try {
        const host = options.host || options;
        const recordType = options.recordType || 'A';

        if (recordType === 'ALL') {
            // Resolve all record types
            const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'];
            const results = {};

            for (const type of recordTypes) {
                try {
                    const result = await dnsPromises.resolve(host, type);
                    results[type] = result;
                } catch (e) {
                    // Ignore errors for individual types
                }
            }

            return { records: results, host };
        } else {
            const records = await dnsPromises.resolve(host, recordType);
            return { records: records.map(r => ({ [recordType]: r })), host };
        }
    } catch (error) {
        throw new Error(`DNS lookup failed: ${error.message}`);
    }
});

ipcMain.handle('dns-reverse-lookup', async (event, options) => {
    const dnsPromises = dns.promises;
    try {
        const ip = options.ip || options;
        const hostname = await dnsPromises.reverse(ip);
        return { hostnames: hostname, ip };
    } catch (error) {
        throw new Error(`Reverse DNS lookup failed: ${error.message}`);
    }
});

ipcMain.handle('net-connect', async (event, port, host) => {
    return new Promise((resolve) => {
        const socket = net.connect(port, host, () => {
            resolve(true);
            socket.end();
        });
        socket.on('error', () => {
            resolve(false);
            socket.end();
        });
    });
});

ipcMain.handle('check-port', async (event, host, port) => {
    return new Promise((resolve) => {
        const socket = net.createConnection(port, host);
        socket.setTimeout(2000);
        socket.on('connect', () => {
            resolve('open');
            socket.end();
        });
        socket.on('timeout', () => {
            resolve('timeout');
            socket.destroy();
        });
        socket.on('error', () => {
            resolve('closed');
            socket.destroy();
        });
    });
});

ipcMain.handle('os-network-interfaces', async () => {
    console.log('os-network-interfaces');
    const networkInterfaces = os.networkInterfaces();
    console.log(networkInterfaces);
    return networkInterfaces;
});

ipcMain.handle('os-homedir', async () => {
    const osModule = require('os');
    return osModule.homedir();
});

ipcMain.handle('fs-exists-sync', async (event, p) => {
    return fs.existsSync(p);
});

ipcMain.handle('fs-mkdir-sync', async (event, p, options) => {
    fs.mkdirSync(p, options);
});

ipcMain.handle('fs-read-file-sync', async (event, p, encoding = 'utf8') => {
    return fs.readFileSync(p, encoding);
});

ipcMain.handle('fs-write-file-sync', async (event, p, data, encoding = 'utf8') => {
    fs.writeFileSync(p, data, encoding);
    return true;
});

ipcMain.handle('fs-readdir-sync', async (event, p) => {
    return fs.readdirSync(p);
});

ipcMain.handle('fs-unlink-sync', async (event, p) => {
    fs.unlinkSync(p);
    return true;
});

ipcMain.handle('fs-rmdir-sync', async (event, p) => {
    fs.rmdirSync(p);
    return true;
});

ipcMain.handle('fs-stat-sync', async (event, p) => {
    const stats = fs.statSync(p);
    return {
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        size: stats.size,
        mtime: stats.mtime.toISOString(),
    };
});

ipcMain.handle('path-join', async (event, ...args) => {
    return path.join(...args);
});

ipcMain.handle('path-resolve', async (event, ...args) => {
    return path.resolve(...args);
});

ipcMain.handle('path-basename', async (event, p) => {
    return path.basename(p);
});

ipcMain.handle('path-dirname', async (event, p) => {
    return path.dirname(p);
});

ipcMain.handle('os-platform', async (event) => {
    return os.platform();
});

// ============================================================
// System Information Handlers
// ============================================================

ipcMain.handle('get-system-info', async () => {
    return {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
        freeMemory: Math.round(os.freemem() / 1024 / 1024) + ' MB',
        uptime: Math.round(os.uptime() / 60 / 60) + ' hours',
        hostname: os.hostname(),
        homeDir: os.homedir()
    };
});

ipcMain.handle('get-cpu-usage', async () => {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;

    cpus.forEach(cpu => {
        for (let type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return {
        usage: Math.max(0, Math.min(100, usage)),
        cores: cpus.length
    };
});

ipcMain.handle('get-memory-usage', async () => {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return {
        total: Math.round(total / 1024 / 1024),
        used: Math.round(used / 1024 / 1024),
        free: Math.round(free / 1024 / 1024),
        percentage: Math.round((used / total) * 100)
    };
});

// ============================================================
// Network Diagnostics Handlers
// ============================================================

ipcMain.handle('get-ip-info', async () => {
    const interfaces = os.networkInterfaces();
    const ipInfo = {};

    for (const [name, addrs] of Object.entries(interfaces)) {
        ipInfo[name] = addrs.filter(addr => !addr.internal).map(addr => ({
            address: addr.address,
            family: addr.family,
            mac: addr.mac
        }));
    }

    return ipInfo;
});

ipcMain.handle('ping-host', async (event, host) => {
    return new Promise((resolve) => {
        const startTime = Date.now();

        dns.lookup(host, (err) => {
            if (err) {
                resolve({ success: false, error: err.message });
            } else {
                const latency = Date.now() - startTime;
                resolve({ success: true, latency, host });
            }
        });
    });
});

ipcMain.handle('check-port-range', async (event, host, startPort, endPort) => {
    const results = [];
    const maxConcurrent = 5;

    for (let port = startPort; port <= endPort; port++) {
        const socket = net.createConnection({
            host,
            port,
            timeout: 100
        });

        const result = await new Promise((resolve) => {
            socket.on('connect', () => {
                resolve({ port, status: 'open' });
                socket.end();
            });

            socket.on('timeout', () => {
                resolve({ port, status: 'timeout' });
                socket.destroy();
            });

            socket.on('error', () => {
                resolve({ port, status: 'closed' });
            });
        });

        results.push(result);
    }

    return results;
});

// ============================================================
// Traceroute Handler
// ============================================================

ipcMain.handle('traceroute', async (event, options) => {
    const { host, maxHops = 30, timeout = 5000, resolveNames = true } = options;
    const hops = [];
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
        try {
            // Determine platform-specific command
            const isWindows = process.platform === 'win32';
            const command = isWindows ? 'tracert' : 'traceroute';
            const args = isWindows
                ? ['-h', maxHops.toString(), host]
                : ['-m', maxHops.toString(), host];

            const child = spawn(command, args, { timeout });
            let output = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                output += data.toString();
            });

            child.on('close', (code) => {
                // Parse the output
                const lines = output.split('\n');
                const parsedHops = [];

                for (const line of lines) {
                    // Skip empty lines and header lines
                    if (!line.trim() || line.includes('Tracing') || line.includes('traceroute')) {
                        continue;
                    }

                    // Windows format: "1    10 ms    10 ms    10 ms  192.168.1.1"
                    // Unix format: "1  gateway (192.168.1.1)  1.234 ms  1.123 ms  1.456 ms"

                    const windowsMatch = line.match(/^\s*(\d+)\s+([*\d]+\s+ms|[*])\s+([*\d]+\s+ms|[*])\s+([*\d]+\s+ms|[*])\s+(.+?)$/);
                    const unixMatch = line.match(/^\s*(\d+)\s+(.+?)\s+([0-9.]+\s+ms|[*])/);

                    if (windowsMatch) {
                        const hopNum = parseInt(windowsMatch[1]);
                        const latency = windowsMatch[4].includes('*') ? null : parseInt(windowsMatch[4]);
                        const ip = windowsMatch[5].trim();

                        parsedHops.push({
                            hop: hopNum,
                            ip: ip,
                            hostname: resolveNames ? ip : 'N/A',
                            latency: latency,
                            status: latency ? 'success' : 'timeout'
                        });
                    } else if (unixMatch) {
                        const hopNum = parseInt(unixMatch[1]);
                        const hostInfo = unixMatch[2].trim();
                        const latency = unixMatch[3].includes('*') ? null : parseFloat(unixMatch[3]);

                        // Extract IP from parentheses if present
                        const ipMatch = hostInfo.match(/\(([0-9.]+)\)/);
                        const ip = ipMatch ? ipMatch[1] : hostInfo;
                        const hostname = hostInfo.split('(')[0].trim();

                        parsedHops.push({
                            hop: hopNum,
                            ip: ip,
                            hostname: hostname || 'Unknown',
                            latency: latency,
                            status: latency ? 'success' : 'timeout'
                        });
                    }
                }

                resolve({
                    success: true,
                    host: host,
                    hops: parsedHops,
                    timestamp: new Date().toISOString()
                });
            });

            child.on('error', (error) => {
                reject({
                    success: false,
                    error: error.message,
                    host: host
                });
            });

        } catch (error) {
            reject({
                success: false,
                error: error.message,
                host: host
            });
        }
    });
});

// ============================================================
// Theme Settings Handlers
// ============================================================

const themePath = path.join(__dirname, 'theme.settings.json');

/**
 * Load theme settings from theme.settings.json
 */
function loadThemeSettings() {
    try {
        if (fs.existsSync(themePath)) {
            const data = fs.readFileSync(themePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading theme settings:', error);
    }
    return null;
}

/**
 * Save theme settings to theme.settings.json
 */
function saveThemeSettings(settings) {
    try {
        const data = JSON.stringify(settings, null, 2);
        fs.writeFileSync(themePath, data, 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving theme settings:', error);
        return false;
    }
}

ipcMain.handle('load-theme-settings', async () => {
    return loadThemeSettings();
});

ipcMain.handle('save-theme-settings', async (event, settings) => {
    return saveThemeSettings(settings);
});

ipcMain.handle('get-theme-mode', async () => {
    const settings = loadThemeSettings();
    return settings ? settings.theme : 'system';
});

ipcMain.handle('set-theme-mode', async (event, mode) => {
    const settings = loadThemeSettings() || {};
    settings.theme = mode;
    settings.lastUpdated = new Date().toISOString();

    // Apply to nativeTheme
    if (mode === 'light' || mode === 'dark') {
        nativeTheme.themeSource = mode;
    } else {
        nativeTheme.themeSource = 'system';
    }

    // Update dark mode flag
    settings.isDarkMode = nativeTheme.shouldUseDarkColors;

    saveThemeSettings(settings);
    return { success: true, theme: mode };
});

ipcMain.handle('get-dark-mode-enabled', async () => {
    return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle('get-color-scheme', async () => {
    const settings = loadThemeSettings();
    if (!settings) return null;

    return {
        isDark: nativeTheme.shouldUseDarkColors,
        colors: {
            primary: settings.colors?.primary || '#6366f1',
            secondary: settings.colors?.secondary || '#8b5cf6',
            accent: settings.colors?.accent || '#3b82f6',
            success: settings.colors?.success || '#22c55e',
            warning: settings.colors?.warning || '#f59e0b',
            error: settings.colors?.error || '#ef4444',
            info: settings.colors?.info || '#3b82f6'
        },
        darkMode: settings.darkMode || {
            background: '#0f0f0f',
            surface: '#1e1e1e',
            text: '#e8e8e8',
            textSecondary: '#b0b0b0'
        },
        lightMode: settings.lightMode || {
            background: '#f9fafb',
            surface: '#ffffff',
            text: '#1f2937',
            textSecondary: '#6b7280'
        }
    };
});

ipcMain.handle('update-custom-colors', async (event, colors) => {
    const settings = loadThemeSettings() || {};
    settings.customColors = true;
    settings.colors = { ...settings.colors, ...colors };
    settings.lastUpdated = new Date().toISOString();
    saveThemeSettings(settings);
    return { success: true, colors: settings.colors };
});

ipcMain.handle('reset-theme-colors', async () => {
    const settings = loadThemeSettings() || {};
    settings.customColors = false;
    settings.colors = {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#3b82f6',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };
    settings.lastUpdated = new Date().toISOString();
    saveThemeSettings(settings);
    return { success: true };
});

// Listen for theme changes
nativeTheme.on('updated', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
        mainWindow.webContents.send('theme-changed', {
            isDark: nativeTheme.shouldUseDarkColors
        });
    }

    // Update settings
    const settings = loadThemeSettings() || {};
    settings.isDarkMode = nativeTheme.shouldUseDarkColors;
    settings.lastUpdated = new Date().toISOString();
    saveThemeSettings(settings);
});

// ============================================================
// File Operations Handlers
// ============================================================

ipcMain.handle('open-file-dialog', async (event, options = {}) => {
    return await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
        properties: ['openFile'],
        ...options
    });
});

ipcMain.handle('save-file-dialog', async (event, options = {}) => {
    return await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), options);
});

ipcMain.handle('open-folder-dialog', async (event, options = {}) => {
    return await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
        properties: ['openDirectory'],
        ...options
    });
});

// ============================================================
// Application Handlers
// ============================================================

ipcMain.handle('get-app-version', async () => {
    return app.getVersion();
});

ipcMain.handle('get-versions', async () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    return {
        app: app.getVersion(),
        electron: process.versions.electron,
        node: process.versions.node,
        chrome: process.versions.chrome,
        v8: process.versions.v8
    };
});

ipcMain.handle('restart-app', async () => {
    app.relaunch();
    app.exit(0);
});

ipcMain.handle('quit-app', async () => {
    app.quit();
});

ipcMain.handle('show-about-dialog', async () => {
    dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
        type: 'info',
        title: 'About NetNavigator',
        message: 'NetNavigator',
        detail: `Version ${app.getVersion()}\n\nA powerful network scanning and monitoring tool for system administrators and developers.`
    });
});

// ============================================================
// Cleanup Handler
// ============================================================

// Clean up active servers on app quit
app.on('before-quit', () => {
    for (const [name, data] of activeServers.entries()) {
        try {
            data.process.kill('SIGTERM');
        } catch (e) {
            console.error(`Failed to kill server ${name}:`, e);
        }
    }
    activeServers.clear();
});

ipcMain.handle('get-commands', () => Array.from(registeredCommands));

ipcMain.handle('get-config', async () => {
    const configPath = path.join(os.homedir(), '.netnavigator', 'config.json');
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading config:', error);
    }
    return {};
});

ipcMain.handle('get-theme', async () => {
    return nativeTheme.themeSource;
});

ipcMain.on('toggle-devtools', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
        const devToolsWin = new BrowserWindow({ width: 800, height: 600, title: 'NetNavigator - DevTools', autoHideMenuBar: true, icon: path.join(__dirname, 'public', process.platform === 'win32' ? 'favicon.ico' : 'network.png'), webPreferences: { nodeIntegration: true, contextIsolation: false } });
        win.webContents.setDevToolsWebContents(devToolsWin.webContents);
        win.webContents.openDevTools({ mode: 'detach' });
    }
});





ipcMain.handle('set-theme', async (event, theme) => {
    if (theme === 'light') {
        nativeTheme.themeSource = 'light';
    } else if (theme === 'dark') {
        nativeTheme.themeSource = 'dark';
    } else if (theme === 'system') {
        nativeTheme.themeSource = 'system';
    }
});

ipcMain.handle('set-auto-update', async (event, enabled) => {
    // Save to config
    const configPath = path.join(os.homedir(), '.netnavigator', 'config.json');
    try {
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        config.autoUpdate = enabled;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error saving auto-update setting:', error);
    }
});



ipcMain.handle('reset-settings', async (event) => {
    const configPath = path.join(os.homedir(), '.netnavigator', 'config.json');
    try {
        fs.writeFileSync(configPath, JSON.stringify({ name: 'NetNavigator', autoUpdate: false }, null, 2));
    } catch (error) {
        console.error('Error resetting settings:', error);
    }
});

ipcMain.handle('clear-cache', async (event) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
        await win.webContents.session.clearCache();
    }
});

ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        console.error('Failed to open external URL:', error);
        return { success: false, error: error.message };
    }
});

// ============================================================
// Quick Access Task Handler
// ============================================================

app.on('second-instance', (event, commandLine, workingDirectory) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;

    if (win.isMinimized()) win.restore();
    win.focus();

    // Handle command line arguments
    const args = commandLine.slice(2);
    if (args.includes('--open-network-scanner')) {
        win.webContents.send('switch-tab', 'scanner');
    } else if (args.includes('--open-port-scanner')) {
        win.webContents.send('switch-tab', 'port');
    } else if (args.includes('--open-traceroute')) {
        win.webContents.send('switch-tab', 'tracert');
    } else if (args.includes('--run-diagnostics')) {
        win.webContents.send('switch-tab', 'diagnostics');
    }
});

app.whenReady().then(async () => {
    await createWindow();

    // Handle initial command line arguments
    const args = process.argv.slice(1);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
        setTimeout(() => {
            if (args.includes('--open-network-scanner')) {
                win.webContents.send('switch-tab', 'scanner');
            } else if (args.includes('--open-port-scanner')) {
                win.webContents.send('switch-tab', 'port');
            } else if (args.includes('--open-traceroute')) {
                win.webContents.send('switch-tab', 'tracert');
            } else if (args.includes('--run-diagnostics')) {
                win.webContents.send('switch-tab', 'diagnostics');
            }
        }, 500);
    }
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

module.exports = {};
