const { ipcRenderer, contextBridge } = require('electron');

ipcRenderer.on('set-mode', (event, mode) => {
  console.log('Mode set to:', mode);
  ipcRenderer.send('set-mode', mode);
});


