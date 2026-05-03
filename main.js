const { app, BrowserWindow, BrowserView, ipcMain, Menu, MenuItem, clipboard } = require('electron')

// 在应用启动前设置 SSL 相关选项
app.commandLine.appendSwitch('ignore-certificate-errors')
app.disableHardwareAcceleration()

console.warn('XFBrowser-Desktop Started!')
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
    canGoBack: activeTab ? activeTab.view.webContents.navigationHistory.canGoBack() : false,
    canGoForward: activeTab ? activeTab.view.webContents.navigationHistory.canGoForward() : false
  }
  console.log(`[sendTabsState] Total tabs: ${tabs.length}, Active tab ID: ${activeTabId}, URL: ${state.url}`)
  mainWindow.webContents.send('tabs-updated', state)
}

function updateActiveViewBounds() {
  const activeTab = getActiveTab()
  if (!activeTab) return
  const bounds = getViewBounds()
  console.log(`[updateActiveViewBounds] Update bounds: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`)
  activeTab.view.setBounds(bounds)
  activeTab.view.setAutoResize({ width: true, height: true })
}

function activateTab(id) {
  const tab = tabs.find(item => item.id === id)
  if (!tab || !mainWindow) return
  console.log(`[activateTab] Activate tab ID: ${id}, URL: ${tab.url}`)
  activeTabId = id
  mainWindow.setBrowserView(tab.view)
  updateActiveViewBounds()
  sendTabsState()
}

function destroyTab(tab) {
  if (!mainWindow || !tab) return
  console.log(`[destroyTab] Destroy tab ID: ${tab.id}`)
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
  console.log(`[closeTab] Close tab ID: ${id}, Index: ${index}`)
  const removedTab = tabs[index]
  const wasActive = activeTabId === id
  tabs.splice(index, 1)
  destroyTab(removedTab)
  console.log(`[closeTab] Remaining tabs after close: ${tabs.length}, Was active tab: ${wasActive}`)

  if (tabs.length === 0) {
    console.log(`[closeTab] No tabs left, create new tab`)
    createTab(HOME_URL, true)
    return
  }

  if (wasActive) {
    const nextIndex = index > 0 ? index - 1 : 0
    console.log(`[closeTab] Active tab closed, activate next tab at index: ${nextIndex}`)
    activateTab(tabs[nextIndex].id)
  } else {
    sendTabsState()
  }
}

function createBrowserView(url) {
  console.log(`[createBrowserView] Create BrowserView, URL: ${url}`)
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true
    }
  })
  
  // 处理证书错误 - 直接接受
  view.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    console.log(`[BrowserView] Certificate error: ${error}`)
    event.preventDefault()
    callback(true)
  })
  
  view.webContents.loadURL(url)
  
  // 添加右键菜单
  view.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()
    
    // 后退
    menu.append(new MenuItem({
      label: '后退',
      enabled: params.canGoBack,
      click: () => view.webContents.goBack()
    }))
    
    // 前进
    menu.append(new MenuItem({
      label: '前进',
      enabled: params.canGoForward,
      click: () => view.webContents.goForward()
    }))
    
    menu.append(new MenuItem({ type: 'separator' }))
    
    // 刷新
    menu.append(new MenuItem({
      label: '刷新',
      click: () => view.webContents.reload()
    }))
    
    // 强制刷新
    menu.append(new MenuItem({
      label: '强制刷新',
      click: () => view.webContents.reloadIgnoringCache()
    }))
    
    menu.append(new MenuItem({ type: 'separator' }))
    
    // 检查元素 (仅在开发者模式下)
    if (params.hasSelection) {
      menu.append(new MenuItem({
        label: '复制',
        click: () => view.webContents.copy()
      }))
    }
    
    menu.append(new MenuItem({
      label: '粘贴',
      enabled: params.canPaste,
      click: () => view.webContents.paste()
    }))
    
    menu.append(new MenuItem({
      label: '全选',
      click: () => view.webContents.selectAll()
    }))
    
    menu.append(new MenuItem({ type: 'separator' }))
    
    // 如果有链接，添加在新标签页中打开
    if (params.linkURL) {
      menu.append(new MenuItem({
        label: '在新标签页中打开链接',
        click: () => createTab(params.linkURL, true)
      }))
      menu.append(new MenuItem({
        label: '复制链接地址',
        click: () => {
          clipboard.writeText(params.linkURL)
        }
      }))
      menu.append(new MenuItem({ type: 'separator' }))
    }
    
    // 如果有图片，添加图片相关选项
    if (params.srcURL) {
      menu.append(new MenuItem({
        label: '在新标签页中打开图片',
        click: () => createTab(params.srcURL, true)
      }))
      menu.append(new MenuItem({
        label: '复制图片地址',
        click: () => {
          clipboard.writeText(params.srcURL)
        }
      }))
      menu.append(new MenuItem({ type: 'separator' }))
    }
    
    // 检查元素
    menu.append(new MenuItem({
      label: '检查元素',
      click: () => view.webContents.inspectElement(params.x, params.y)
    }))
    
    // 查看页面源代码
    menu.append(new MenuItem({
      label: '查看页面源代码',
      click: () => {
        const sourceUrl = `view-source:${view.webContents.getURL()}`
        createTab(sourceUrl, true)
      }
    }))
    
    menu.popup()
  })
  
  // 添加键盘快捷键
  view.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      // F12 或 Ctrl+Shift+I 打开开发者工具
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        event.preventDefault()
        if (view.webContents.isDevToolsOpened()) {
          view.webContents.closeDevTools()
        } else {
          view.webContents.openDevTools()
        }
      }
      // Ctrl+R 刷新
      else if (input.control && input.key.toLowerCase() === 'r') {
        event.preventDefault()
        view.webContents.reload()
      }
      // Ctrl+Shift+R 强制刷新
      else if (input.control && input.shift && input.key.toLowerCase() === 'r') {
        event.preventDefault()
        view.webContents.reloadIgnoringCache()
      }
    }
  })
  
  return view
}

function createTab(url = HOME_URL, activate = true) {
  if (!mainWindow) return
  const id = Date.now() + Math.floor(Math.random() * 1000)
  console.log(`[createTab] Create new tab ID: ${id}, URL: ${url}, Activate: ${activate}`)
  const view = createBrowserView(url)
  const tab = { id, title: 'New Tab', url, view }

  view.webContents.on('page-title-updated', (event, title) => {
    tab.title = title || 'Page'
    console.log(`[BrowserView] Title updated: ${tab.title}`)
    sendTabsState()
  })

  view.webContents.on('did-navigate', () => {
    tab.url = view.webContents.getURL()
    console.log(`[BrowserView] Page navigated: ${tab.url}`)
    sendTabsState()
  })

  view.webContents.on('did-navigate-in-page', () => {
    tab.url = view.webContents.getURL()
    console.log(`[BrowserView] In-page navigation: ${tab.url}`)
    sendTabsState()
  })

  view.webContents.on('new-window', (event, url) => {
    console.log(`[BrowserView] Detected new window request: ${url}, open in new tab`)
    event.preventDefault()
    createTab(url, true)
  })

  tabs.push(tab)
  console.log(`[createTab] Tab added to array, total: ${tabs.length}`)

  if (activate) {
    activateTab(id)
  } else {
    sendTabsState()
  }
}

function createWindow() {
  console.log('[createWindow] Create main window')
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
  console.log('[createWindow] Load index.html')
  mainWindow.on('resize', () => updateActiveViewBounds())
  mainWindow.on('closed', () => {
    console.log('[createWindow] Main window closed')
    tabs.forEach(destroyTab)
    tabs = []
    mainWindow = null
  })
}

app.whenReady().then(() => {
  console.log('[app] App ready, creating window')
  createWindow()

  ipcMain.on('renderer-ready', (event, headerHeight) => {
    console.log(`[IPC] renderer-ready, page height: ${headerHeight}`)
    rendererReady = true
    if (typeof headerHeight === 'number' && headerHeight > 0) {
      VIEW_TOP = Math.round(headerHeight)
    }
    if (tabs.length === 0) {
      console.log(`[renderer-ready] Initialize, create welcome page`)
      createTab('file://' + __dirname + '/welcome.html', true)
      return
    }
    sendTabsState()
  })

  ipcMain.on('create-tab', (event, url) => {
    console.log(`[IPC] create-tab request, URL: ${url}`)
    createTab(url || HOME_URL, true)
  })
  ipcMain.on('close-tab', (event, id) => {
    console.log(`[IPC] close-tab request, ID: ${id}`)
    closeTab(id)
  })
  ipcMain.on('switch-tab', (event, id) => {
    console.log(`[IPC] switch-tab request, ID: ${id}`)
    activateTab(id)
  })
  ipcMain.on('navigate', (event, url) => {
    console.log(`[IPC] navigate request, URL: ${url}`)
    const activeTab = getActiveTab()
    if (!activeTab) return
    activeTab.url = url
    activeTab.view.webContents.loadURL(url)
    sendTabsState()
  })
  ipcMain.on('go-back', () => {
    console.log(`[IPC] go-back request`)
    const activeTab = getActiveTab()
    if (activeTab && activeTab.view.webContents.navigationHistory.canGoBack()) {
      activeTab.view.webContents.navigationHistory.goBack()
    }
  })
  ipcMain.on('go-forward', () => {
    console.log(`[IPC] go-forward request`)
    const activeTab = getActiveTab()
    if (activeTab && activeTab.view.webContents.navigationHistory.canGoForward()) {
      activeTab.view.webContents.navigationHistory.goForward()
    }
  })
  ipcMain.on('reload', () => {
    console.log(`[IPC] reload request`)
    const activeTab = getActiveTab()
    if (activeTab) activeTab.view.webContents.reload()
  })

  ipcMain.on('window-minimize', () => {
    console.log('[IPC] window-minimize request')
    mainWindow.minimize()
  })
  ipcMain.on('window-maximize', () => {
    console.log('[IPC] window-maximize request')
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window-close', () => {
    console.log('[IPC] window-close request')
    mainWindow.close()
  })

  ipcMain.on('open-settings', () => {
    console.log('[IPC] open-settings request')
    if (settingsWindow) {
      console.log('[open-settings] Settings window exists, focus')
      settingsWindow.focus()
      return
    }

    console.log('[open-settings] Create new settings window')

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
      console.log('[open-settings] Settings window closed')
      settingsWindow = null
    })
    settingsWindow.show()
  })

  ipcMain.on('settings-saved', (event, settings) => {
    console.log('[IPC] settings-saved, settings:', settings)
    mainWindow.webContents.send('settings-updated', settings)
  })
})

app.on('window-all-closed', () => {
  console.log('[app] All windows closed')
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  console.log('[app] App activated')
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
