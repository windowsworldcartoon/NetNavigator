const { app, BrowserWindow, ipcMain, dialog, net, Menu, nativeTheme, Tray, } = require('electron');
const path = require('path');

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
                    dialog.showMessageBox({
                        type: 'info',
                        title: 'About NetNavigator',
                        message: 'NetNavigator - Network diagnostics tool',
                        detail: 'Version 1.0.0'
                    });
                }
            }
        ]
    }
];

function createWindow() {
    
    
  
  const publicPath = path.join(__dirname, 'public');
  const os = [
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
    title: `NetNavigator (${os.find(o => o.id === process.platform).name})`,
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
        }
    ])
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

  win.webContents.on('context-menu', (e, params) => {
    e.preventDefault();
    if (!params.isEditable) {
        contextMenu.popup({ window: win });
    } else {
        editMenu.popup({ window: win });
    }
  });
  ipcMain.on('check-for-updates', () => {
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
        console.log(data)
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



app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
