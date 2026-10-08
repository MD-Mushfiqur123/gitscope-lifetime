const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gitscope', {
  scanGithub: (params) => ipcRenderer.invoke('scan-github', params),
  exportData: (params) => ipcRenderer.invoke('export-data', params),
  onProgress: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('scan-progress', handler);
    return () => ipcRenderer.removeListener('scan-progress', handler);
  }
});
