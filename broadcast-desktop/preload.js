const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showWindow: (isEmergency) => ipcRenderer.send('show-window', isEmergency)
});
