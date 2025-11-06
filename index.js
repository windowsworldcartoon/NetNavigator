const { app, BrowserWindow, ipcMain, dialog, net, Menu, nativeTheme, Tray, shell, autoUpdater } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
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



const menuTemplate = [
    {
        label: 'File',
        submenu: [
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
        label: 'Window',
        submenu: [
            {
                label: 'Minimize',
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
            { role: 'close' },
            
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
            { role: 'paste' }
        ]
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            {
                label: 'Toggle DevTools',
                accelerator: 'F12',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) {
                        const devtoolsWin = new BrowserWindow({ width: 800, height: 600, title: 'NetNavigator - DevTools', autoHideMenuBar: true, icon: path.join(__dirname, 'public', process.platform === 'win32' ? 'favicon.ico' : 'network.png'), webPreferences: { nodeIntegration: true, contextIsolation: false } });
                        win.webContents.setDevToolsWebContents(devtoolsWin.webContents);
                        win.webContents.openDevTools({ mode: 'detach' });
                    }
                }
            },
            { label: 'Check for Updates', click: () => { ipcMain.emit('check-for-updates') } },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
            { label: 'Toggle Theme', submenu: [
                { label: 'Light', click: () => { nativeTheme.themeSource = 'light' } },
                { label: 'Dark', click: () => { nativeTheme.themeSource = 'dark' } },
                { label: 'System', click: () => { nativeTheme.themeSource = 'system' } }
            ]}
        ]
    },
    {
        label: 'Network',
        submenu: [
            {
                label: 'Network Scanner',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'scanner');
                }
            },
            {
                label: 'Port Checker',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'port');
                }
            },
            {
                label: 'DNS Resolver',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'dns');
                }
            },
            {
                label: 'Network Monitor',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'monitor');
                }
            },
            {
                label: 'Network Optimization',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'optimize');
                }
            },
            {
                label: 'Network Info',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'info');
                }
            }
        ]
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'About',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    dialog.showMessageBox(win, {
                        type: 'info',
                        title: 'Open External',
                        message: 'Your about to open https://github.com/windowsworldcartoon/NetNavigator',
                        detail: 'Do you want to open it in your default browser?',
                        buttons: ['Open External', 'No']
                    }).then(result => {
                        if (result.response === 0) {
                            shell.openExternal('https://github.com/windowsworldcartoon/NetNavigator');
                        }
                    });
                }
            },
        ]
    }
];

function createWindow() {
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
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'public', process.platform === 'win32' ? 'favicon.ico' : 'network.png'), // Assuming icon.png in public
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      spellcheck: true
    }
  });
  win.loadFile(path.join(publicPath, 'index.html'));

  const menu = Menu.buildFromTemplate([
    {
        label: 'File',
        submenu: [
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
        label: 'Window',
        submenu: [
            {
                label: 'Minimize',
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
            { role: 'close' },
            
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
            { role: 'paste' }
        ]
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            {
                label: 'Toggle DevTools',
                accelerator: 'F12',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    if (win) {
                        const devtoolsWin = new BrowserWindow({ width: 800, height: 600, title: 'NetNavigator - DevTools', autoHideMenuBar: true, icon: path.join(__dirname, 'public', process.platform === 'win32' ? 'favicon.ico' : 'network.png'), webPreferences: { nodeIntegration: true, contextIsolation: false } });
                        win.webContents.setDevToolsWebContents(devtoolsWin.webContents);
                        win.webContents.openDevTools({ mode: 'detach' });
                    }
                }
            },
            { label: 'Check for Updates', click: () => { ipcMain.emit('check-for-updates') } },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
            { label: 'Toggle Theme', submenu: [
                { label: 'Light', type: 'radio', checked: nativeTheme.themeSource === 'light', click: () => { nativeTheme.themeSource = 'light' } },
                { label: 'Dark', type: 'radio', checked: nativeTheme.themeSource === 'dark', click: () => { nativeTheme.themeSource = 'dark' } },
                { label: 'System', type: 'radio', checked: nativeTheme.themeSource === 'system', click: () => { nativeTheme.themeSource = 'system' } }
            ]}
        ]
    },
    {
        label: 'Network',
        submenu: [
            {
                label: 'Network Scanner',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'scanner');
                }
            },
            {
                label: 'Port Checker',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'port');
                }
            },
            {
                label: 'DNS Resolver',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'dns');
                }
            },
            {
                label: 'Network Monitor',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'monitor');
                }
            },
            {
                label: 'Network Optimization',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'optimize');
                }
            },
            {
                label: 'Network Info',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    win.webContents.send('switch-tab', 'info');
                }
            }
        ]
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'About',
                click: () => {
                    const win = BrowserWindow.getFocusedWindow();
                    dialog.showMessageBox(win, {
                        type: 'info',
                        title: 'About',
                        message: 'Your about to open https://github.com/windowsworldcartoon/NetNavigator',
                        detail: 'Do you want to open it in your default browser?',
                        buttons: ['Open External', 'No']
                    }).then(result => {
                        if (result.response === 0) {
                            shell.openExternal('https://github.com/windowsworldcartoon/NetNavigator');
                         }
                    });
                }
            },
        ]
    },
  ]);  
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
        const newConfig = { name: 'NetNavigator', autoUpdate: false };
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  }


  
  const contextMenu = Menu.buildFromTemplate([
    { role: 'copy' },
    { role: 'paste' },
    { role: 'reload' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
    { type: 'separator' },
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
        contextMenu.popup({ window: win });
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
    
  app.on('activate', function() {
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



 ipcMain.on('check-for-updates', () => {
    const win = BrowserWindow.getFocusedWindow();
    const network = net.isOnline();
    if (!network) {
        dialog.showMessageBox(win, {
            type: 'error',
            title: 'No Internet Connection',
            message: 'Please check your internet connection and try again.'
        });
        return;
    }
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
    return {...data, version: app.getVersion()};
});

ipcMain.handle('open-external', async (event, url) => {
    shell.openExternal(url);
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
