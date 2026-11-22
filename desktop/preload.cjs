const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld(
  'openshot',
  Object.freeze({
    platform: process.platform,
    version: '1.0.0',
    capture: () => ipcRenderer.invoke('capture'),
  }),
)
