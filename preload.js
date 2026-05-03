const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  onTabs: (cb) => ipcRenderer.on('tabs', (_, data) => cb(data)),

  newTab: (url) => ipcRenderer.send('new-tab', url),
  switchTab: (i) => ipcRenderer.send('switch-tab', i),
  closeTab: (i) => ipcRenderer.send('close-tab', i),

  navigate: (url) => ipcRenderer.send('navigate', url),

  back: () => ipcRenderer.send('back'),
  forward: () => ipcRenderer.send('forward'),
  refresh: () => ipcRenderer.send('refresh'),
  devtools: () => ipcRenderer.send('devtools')
})