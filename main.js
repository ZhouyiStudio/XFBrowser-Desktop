const { app, BrowserWindow, BrowserView, ipcMain } = require('electron')

const HOME_URL = 'https://www.baidu.com'
let VIEW_TOP = 96
let mainWindow = null
let settingsWindow = null
let tabs = []
let activeTabId = null
let rendererReady = false

function getActiveTab() {
  return tabs.find(tab => tab.id === activeTabId)
}

function getViewBounds() {
  const { width, height } = mainWindow.getContentBounds()
  return {
    x: 0,
    y: VIEW_TOP,
    width: width,
    height: Math.max(0, height - VIEW_TOP)
  }
}

function sendTabsState() {
  if (!rendererReady || !mainWindow) return
  const activeTab = getActiveTab()
  const state = {
    tabs: tabs.map(tab => ({ id: tab.id, title: tab.title, url: tab.url })),
    activeTabId,
    url: activeTab ? activeTab.url : '',
    canGoBack: activeTab ? activeTab.view.webContents.canGoBack() : false,
    canGoForward: activeTab ? activeTab.view.webContents.canGoForward() : false
  }
  mainWindow.webContents.send('tabs-updated', state)
}

function updateActiveViewBounds() {
  const activeTab = getActiveTab()
  if (!activeTab) return
  const bounds = getViewBounds()
  activeTab.view.setBounds(bounds)
  activeTab.view.setAutoResize({ width: true, height: true })
}

function activateTab(id) {
  const tab = tabs.find(item => item.id === id)
  if (!tab || !mainWindow) return
  activeTabId = id
  mainWindow.setBrowserView(tab.view)
  updateActiveViewBounds()
  sendTabsState()
}

function destroyTab(tab) {
  if (!mainWindow || !tab) return
  try {
    mainWindow.removeBrowserView(tab.view)
  } catch (_) {
    // ignore if not attached
  }
  try {
    tab.view.webContents.destroy()
  } catch (_) {
    // ignore cleanup errors
  }
}

function closeTab(id) {
  const index = tabs.findIndex(tab => tab.id === id)
  if (index === -1) return
  const removedTab = tabs[index]
  const wasActive = activeTabId === id
  tabs.splice(index, 1)
  destroyTab(removedTab)

  if (tabs.length === 0) {
    createTab(HOME_URL, true)
    return
  }

  if (wasActive) {
    const nextIndex = index > 0 ? index - 1 : 0
    activateTab(tabs[nextIndex].id)
  } else {
    sendTabsState()
  }
}

function createBrowserView(url) {
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  view.webContents.loadURL(url)
  return view
}

function createTab(url = HOME_URL, activate = true) {
  if (!mainWindow) return
  const id = Date.now() + Math.floor(Math.random() * 1000)
  const view = createBrowserView(url)
  const tab = { id, title: '新标签页', url, view }

  view.webContents.on('page-title-updated', (event, title) => {
    tab.title = title || '网页'
    sendTabsState()
  })

  view.webContents.on('did-navigate', () => {
    tab.url = view.webContents.getURL()
    sendTabsState()
  })

  view.webContents.on('did-navigate-in-page', () => {
    tab.url = view.webContents.getURL()
    sendTabsState()
  })

  view.webContents.on('new-window', (event, url) => {
    event.preventDefault()
    createTab(url, true)
  })

  tabs.push(tab)

  if (activate) {
    activateTab(id)
  } else {
    sendTabsState()
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
  mainWindow.on('resize', () => updateActiveViewBounds())
  mainWindow.on('closed', () => {
    tabs.forEach(destroyTab)
    tabs = []
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.on('renderer-ready', (event, headerHeight) => {
    rendererReady = true
    if (typeof headerHeight === 'number' && headerHeight > 0) {
      VIEW_TOP = Math.round(headerHeight)
    }
    if (tabs.length === 0) {
      createTab('file://' + __dirname + '/welcome.html', true)
      return
    }
    sendTabsState()
  })

  ipcMain.on('create-tab', (event, url) => createTab(url || HOME_URL, true))
  ipcMain.on('close-tab', (event, id) => closeTab(id))
  ipcMain.on('switch-tab', (event, id) => activateTab(id))
  ipcMain.on('navigate', (event, url) => {
    const activeTab = getActiveTab()
    if (!activeTab) return
    activeTab.url = url
    activeTab.view.webContents.loadURL(url)
    sendTabsState()
  })
  ipcMain.on('go-back', () => {
    const activeTab = getActiveTab()
    if (activeTab && activeTab.view.webContents.canGoBack()) {
      activeTab.view.webContents.goBack()
    }
  })
  ipcMain.on('go-forward', () => {
    const activeTab = getActiveTab()
    if (activeTab && activeTab.view.webContents.canGoForward()) {
      activeTab.view.webContents.goForward()
    }
  })
  ipcMain.on('reload', () => {
    const activeTab = getActiveTab()
    if (activeTab) activeTab.view.webContents.reload()
  })

  ipcMain.on('window-minimize', () => mainWindow.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window-close', () => mainWindow.close())

  ipcMain.on('open-settings', () => {
    if (settingsWindow) {
      settingsWindow.focus()
      return
    }

    settingsWindow = new BrowserWindow({
      width: 500,
      height: 420,
      parent: mainWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    settingsWindow.loadFile('settings.html')
    settingsWindow.on('closed', () => {
      settingsWindow = null
    })
    settingsWindow.show()
  })

  ipcMain.on('settings-saved', (event, settings) => {
    mainWindow.webContents.send('settings-updated', settings)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})