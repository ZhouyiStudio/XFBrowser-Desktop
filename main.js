const { app, BrowserWindow, BrowserView, ipcMain, Menu, MenuItem, clipboard, nativeTheme } = require('electron')
const fs = require('fs')
const path = require('path')

// 在应用启动前设置 SSL 相关选项
app.commandLine.appendSwitch('ignore-certificate-errors')
app.disableHardwareAcceleration()

console.warn('XFBrowser-Desktop Started!')
const HOME_URL = 'xf://homepage'
let VIEW_TOP = 96
let mainWindow = null
let settingsWindow = null
let browserSettings = {
  homePage: 'xf://homepage',
  searchEngine: 'baidu',
  darkMode: false,
  downloadIntercept: true
}
let tabs = []
let activeTabId = null
let rendererReady = false

// 加载设置
function loadSettings() {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      browserSettings = { ...browserSettings, ...JSON.parse(data) }
      console.log('[Settings] Loaded settings:', browserSettings)
    }
  } catch (error) {
    console.error('[Settings] Failed to load settings:', error)
  }
}

// 保存设置
function saveSettings() {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    fs.writeFileSync(settingsPath, JSON.stringify(browserSettings, null, 2))
    console.log('[Settings] Saved settings:', browserSettings)
  } catch (error) {
    console.error('[Settings] Failed to save settings:', error)
  }
}

function getActiveTab() {
  return tabs.find(tab => tab.id === activeTabId)
}

function updateWindowTitleForTab(tab) {
  if (!mainWindow || !tab) return
  const label = tab.title || tab.url || 'XFBrowser'
  mainWindow.setTitle(`XFBrowser - ${label}`)
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

function resolveUrl(url) {
  if (!url) return url
  if (url === 'xf://homepage') return `file://${__dirname}/welcome.html`
  if (url === 'xf://settings') return `file://${__dirname}/settings.html`
  if (url === 'xuanfeng://homepage') return `file://${__dirname}/welcome.html`
  if (url === 'xuanfeng://settings') return `file://${__dirname}/settings.html`
  return url
}

function fileUrlPath(url) {
  try {
    return new URL(url).pathname
  } catch (_) {
    return null
  }
}

function isMappedSpecialUrl(tabUrl, loadedUrl) {
  const mapped = resolveUrl(tabUrl)
  if (!mapped || !mapped.startsWith('file://')) return false
  const mappedPath = fileUrlPath(mapped)
  const loadedPath = fileUrlPath(loadedUrl)
  return mappedPath && loadedPath && mappedPath === loadedPath
}

function sendTabsState() {
  if (!rendererReady || !mainWindow) return
  const activeTab = getActiveTab()
  const state = {
    tabs: tabs.map(tab => ({ id: tab.id, title: tab.title, url: tab.url })),
    activeTabId,
    url: activeTab ? activeTab.url : '',
    canGoBack: activeTab ? activeTab.view.webContents.navigationHistory.canGoBack() : false,
    canGoForward: activeTab ? activeTab.view.webContents.navigationHistory.canGoForward() : false,
    isLoading: activeTab ? activeTab.view.webContents.isLoading() : false
  }
  console.log(`[sendTabsState] Total tabs: ${tabs.length}, Active tab ID: ${activeTabId}, URL: ${state.url}, isLoading: ${state.isLoading}`)
  mainWindow.webContents.send('tabs-updated', state)
}

function updateActiveViewBounds() {
  const activeTab = getActiveTab()
  if (!activeTab) return
  const bounds = getViewBounds()
  console.log(`[updateActiveViewBounds] Update bounds: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`)
  activeTab.view.setBounds(bounds)
  // 移除setAutoResize，使用手动bounds控制
}

function activateTab(id) {
  const tab = tabs.find(item => item.id === id)
  if (!tab || !mainWindow) return
  console.log(`[activateTab] Activate tab ID: ${id}, URL: ${tab.url}`)
  activeTabId = id
  mainWindow.setBrowserView(tab.view)
  updateActiveViewBounds()
  updateWindowTitleForTab(tab)
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

// ── Chromium 错误码 → 名称映射 ──
function getErrorName(code) {
  const ERRORS = {
    '-1':   'ERR_IO_PENDING',
    '-2':   'ERR_FAILED',
    '-3':   'ERR_ABORTED',
    '-6':   'ERR_FILE_NOT_FOUND',
    '-21':  'ERR_NETWORK_CHANGED',
    '-23':  'ERR_INTERNET_DISCONNECTED',
    '-24':  'ERR_NETWORK_ACCESS_DENIED',
    '-27':  'ERR_NETWORK_IO_SUSPENDED',
    '-100': 'ERR_CONNECTION_CLOSED',
    '-101': 'ERR_CONNECTION_RESET',
    '-102': 'ERR_CONNECTION_REFUSED',
    '-104': 'ERR_CONNECTION_FAILED',
    '-105': 'ERR_NAME_NOT_RESOLVED',
    '-106': 'ERR_DNS_TIMED_OUT',
    '-107': 'ERR_SSL_PROTOCOL_ERROR',
    '-108': 'ERR_ADDRESS_UNREACHABLE',
    '-109': 'ERR_ADDRESS_INVALID',
    '-112': 'ERR_DNS_TIMED_OUT',
    '-113': 'ERR_SSL_VERSION_OR_CIPHER_MISMATCH',
    '-118': 'ERR_CONNECTION_TIMED_OUT',
    '-200': 'ERR_CERT_COMMON_NAME_INVALID',
    '-201': 'ERR_CERT_DATE_INVALID',
    '-202': 'ERR_CERT_AUTHORITY_INVALID',
    '-205': 'ERR_CERT_REVOKED',
    '-206': 'ERR_CERT_INVALID',
    '-207': 'ERR_CERT_WEAK_SIGNATURE_ALGORITHM',
    '-301': 'ERR_TUNNEL_CONNECTION_FAILED',
    '-310': 'ERR_TOO_MANY_REDIRECTS',
    '-324': 'ERR_EMPTY_RESPONSE',
    '-325': 'ERR_RESPONSE_HEADERS_TOO_BIG',
    '-337': 'ERR_DNS_SEARCH_EMPTY'
  }
  return ERRORS[String(code)] || `ERR_UNKNOWN(${code})`
}

function createBrowserView(url, tabId) {
  console.log(`[createBrowserView] Create BrowserView, URL: ${url}, Tab ID: ${tabId}`)
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

  view.webContents.on('did-start-loading', () => {
    console.log(`[BrowserView] Start loading, Tab ID: ${tabId}`)
    if (rendererReady && mainWindow) {
      mainWindow.webContents.send('load-state-changed', { id: tabId, isLoading: true })
    }
  })

  view.webContents.on('did-stop-loading', () => {
    console.log(`[BrowserView] Stop loading, Tab ID: ${tabId}`)
    if (rendererReady && mainWindow) {
      mainWindow.webContents.send('load-state-changed', { id: tabId, isLoading: false })
    }
  })

  view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.log(`[BrowserView] Load failed, Tab ID: ${tabId}, Error code: ${errorCode}, Description: ${errorDescription}, URL: ${validatedURL}, isMainFrame: ${isMainFrame}`)

    if (!rendererReady || !mainWindow) return

    // 始终通知渲染进程停止加载状态
    mainWindow.webContents.send('load-state-changed', { id: tabId, isLoading: false })

    // ── 只在主帧加载失败时显示错误页 ──
    if (!isMainFrame) return

    // 忽略 ERR_ABORTED（通常是用户主动取消导航）
    if (errorCode === -3) return

    // 忽略 xf:// 内部页面的加载失败
    if (validatedURL && validatedURL.startsWith('xf://')) return

    const errorName = getErrorName(errorCode)
    const errorPageUrl = `file://${__dirname}/error.html?url=${encodeURIComponent(validatedURL || tab.url)}&errorCode=${encodeURIComponent(errorName)}&errorDesc=${encodeURIComponent(errorDescription || '')}`

    console.log(`[BrowserView] Loading error page: ${errorPageUrl}`)
    view.webContents.loadURL(errorPageUrl)
  })
  
  view.webContents.loadURL(resolveUrl(url))
  
  // 添加右键菜单
  view.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()

    menu.append(new MenuItem({
      label: '后退',
      accelerator: 'Alt+Left',
      enabled: params.canGoBack,
      click: () => view.webContents.goBack()
    }))

    menu.append(new MenuItem({
      label: '前进',
      accelerator: 'Alt+Right',
      enabled: params.canGoForward,
      click: () => view.webContents.goForward()
    }))

    menu.append(new MenuItem({ type: 'separator' }))

    menu.append(new MenuItem({
      label: '刷新',
      accelerator: 'Ctrl+R',
      click: () => view.webContents.reload()
    }))

    menu.append(new MenuItem({
      label: '强制刷新',
      accelerator: 'Ctrl+Shift+R',
      click: () => view.webContents.reloadIgnoringCache()
    }))

    menu.append(new MenuItem({ type: 'separator' }))

    if (params.hasSelection) {
      menu.append(new MenuItem({
        label: '复制',
        accelerator: 'Ctrl+C',
        click: () => view.webContents.copy()
      }))
    }

    menu.append(new MenuItem({
      label: '粘贴',
      accelerator: 'Ctrl+V',
      enabled: params.canPaste,
      click: () => view.webContents.paste()
    }))

    menu.append(new MenuItem({
      label: '全选',
      accelerator: 'Ctrl+A',
      click: () => view.webContents.selectAll()
    }))

    menu.append(new MenuItem({ type: 'separator' }))

    menu.append(new MenuItem({
      label: '另存为网页',
      accelerator: 'Ctrl+S',
      click: async () => {
        const savePathResult = await require('electron').dialog.showSaveDialog(mainWindow, {
          title: '保存网页为',
          defaultPath: 'page.html',
          filters: [
            { name: 'HTML 文件', extensions: ['html'] }
          ]
        })

        if (!savePathResult.canceled && savePathResult.filePath) {
          const saveFilePath = savePathResult.filePath
          console.log(`[Save Page] Saving current page to: ${saveFilePath}`)
          view.webContents.savePage(saveFilePath, 'HTMLComplete')
            .then(() => console.log('[Save Page] 页面已保存'))
            .catch(error => console.error('[Save Page] 保存失败:', error))
        }
      }
    }))

    menu.append(new MenuItem({
      label: '打印',
      accelerator: 'Ctrl+P',
      click: () => view.webContents.print()
    }))

    menu.append(new MenuItem({ type: 'separator' }))

    if (params.linkURL) {
      menu.append(new MenuItem({
        label: '在新标签页中打开链接',
        click: () => createTab(params.linkURL, true)
      }))
      menu.append(new MenuItem({
        label: '复制链接地址',
        click: () => clipboard.writeText(params.linkURL)
      }))
      menu.append(new MenuItem({ type: 'separator' }))
    }

    if (params.srcURL) {
      menu.append(new MenuItem({
        label: '在新标签页中打开图片',
        click: () => createTab(params.srcURL, true)
      }))
      menu.append(new MenuItem({
        label: '复制图片地址',
        click: () => clipboard.writeText(params.srcURL)
      }))
      menu.append(new MenuItem({ type: 'separator' }))
    }

    menu.append(new MenuItem({
      label: '查看页面源代码',
      accelerator: 'Ctrl+U',
      click: () => {
        const sourceUrl = `view-source:${view.webContents.getURL()}`
        createTab(sourceUrl, true)
      }
    }))

    menu.append(new MenuItem({
      label: '检查元素',
      accelerator: 'Ctrl+Shift+I',
      click: () => view.webContents.inspectElement(params.x, params.y)
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
      // Ctrl+W 关闭当前标签页
      else if (input.control && input.key.toLowerCase() === 'w') {
        event.preventDefault()
        closeTab(activeTabId)
      }
    }
  })
  
  // 添加下载拦截
  view.webContents.session.on('will-download', (event, item, webContents) => {
    console.log(`[Download] Download requested: ${item.getFilename()}`)
    
    if (browserSettings.downloadIntercept) {
      event.preventDefault()
      
      const options = {
        type: 'question',
        buttons: ['下载', '取消'],
        defaultId: 0,
        cancelId: 1,
        title: '下载确认',
        message: `是否下载文件 "${item.getFilename()}"？`,
        detail: `文件大小: ${item.getTotalBytes() > 0 ? (item.getTotalBytes() / 1024 / 1024).toFixed(2) + ' MB' : '未知'}\n来源: ${item.getURL()}`
      }
      
      const { dialog } = require('electron')
      dialog.showMessageBox(mainWindow, options).then(result => {
        if (result.response === 0) { // 用户选择了下载
          console.log(`[Download] User confirmed download: ${item.getFilename()}`)
          startDownload(item)
        } else {
          console.log(`[Download] User cancelled download: ${item.getFilename()}`)
        }
      })
    } else {
      // 如果未启用拦截，直接下载到默认位置
      startDownload(item)
    }
  })

  function startDownload(item) {
    const path = require('path')
    const os = require('os')
    item.setSavePath(path.join(os.homedir(), 'Downloads', item.getFilename()))
    
    // 发送下载开始事件
    mainWindow.webContents.send('download-started', {
      filename: item.getFilename(),
      total: item.getTotalBytes()
    })
    
    item.on('updated', (event, state) => {
      if (state === 'progressing') {
        if (!item.isPaused()) {
          // 发送下载进度事件
          mainWindow.webContents.send('download-progress', {
            filename: item.getFilename(),
            received: item.getReceivedBytes(),
            total: item.getTotalBytes()
          })
        }
      }
    })
    
    item.once('done', (event, state) => {
      if (state === 'completed') {
        console.log(`[Download] Download completed: ${item.getFilename()}`)
        mainWindow.webContents.send('download-completed', {
          filename: item.getFilename(),
          url: item.getURL(),
          total: item.getTotalBytes(),
          path: item.getSavePath()
        })
        const { dialog } = require('electron')
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: '下载完成',
          message: `文件 "${item.getFilename()}" 下载完成`,
          buttons: ['确定']
        })
      } else if (state === 'cancelled') {
        console.log(`[Download] Download cancelled: ${item.getFilename()}`)
        mainWindow.webContents.send('download-failed', {
          filename: item.getFilename(),
          url: item.getURL(),
          reason: 'cancelled'
        })
      } else {
        console.log(`[Download] Download failed: ${item.getFilename()}`)
        mainWindow.webContents.send('download-failed', {
          filename: item.getFilename(),
          url: item.getURL(),
          reason: state
        })
        const { dialog } = require('electron')
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: '下载失败',
          message: `文件 "${item.getFilename()}" 下载失败`,
          buttons: ['确定']
        })
      }
    })
    
    item.startDownload()
  }
  
  return view
}

function createTab(url = HOME_URL, activate = true) {
  if (!mainWindow) return
  const id = Date.now() + Math.floor(Math.random() * 1000)
  console.log(`[createTab] Create new tab ID: ${id}, URL: ${url}, Activate: ${activate}`)
  const view = createBrowserView(url, id)
  const tab = { id, title: url && url.startsWith('view-source:') ? '查看源代码' : 'New Tab', url, view }

  view.webContents.on('page-title-updated', (event, title) => {
    tab.title = title || 'Page'
    console.log(`[BrowserView] Title updated: ${tab.title}`)
    if (tab.id === activeTabId) {
      updateWindowTitleForTab(tab)
    }
    sendTabsState()
  })

  view.webContents.on('did-navigate', () => {
    const loadedUrl = view.webContents.getURL()
    if (!isMappedSpecialUrl(tab.url, loadedUrl)) {
      tab.url = loadedUrl
    }
    console.log(`[BrowserView] Page navigated: ${loadedUrl}, Display URL: ${tab.url}`)
    if (tab.id === activeTabId) {
      updateWindowTitleForTab(tab)
    }
    sendTabsState()
  })

  view.webContents.on('did-navigate-in-page', () => {
    const loadedUrl = view.webContents.getURL()
    if (!isMappedSpecialUrl(tab.url, loadedUrl)) {
      tab.url = loadedUrl
    }
    console.log(`[BrowserView] In-page navigation: ${loadedUrl}, Display URL: ${tab.url}`)
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
    title: 'XFBrowser',
    icon: path.join(__dirname, 'icons', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('mainpage.html')
  console.log('[createWindow] Loaded MainPage')
  mainWindow.on('resize', () => updateActiveViewBounds())
  mainWindow.on('maximize', () => updateActiveViewBounds())
  mainWindow.on('unmaximize', () => updateActiveViewBounds())
  mainWindow.on('restore', () => updateActiveViewBounds())
  mainWindow.on('enter-full-screen', () => updateActiveViewBounds())
  mainWindow.on('leave-full-screen', () => updateActiveViewBounds())
  mainWindow.on('closed', () => {
    console.log('[createWindow] Main window closed')
    tabs.forEach(destroyTab)
    tabs = []
    mainWindow = null
  })
}

app.whenReady().then(() => {
  console.log('[app] App ready, loading settings and creating window')
  loadSettings()
  nativeTheme.themeSource = browserSettings.darkMode ? 'dark' : 'light'
  createWindow()

  ipcMain.on('renderer-ready', (event, headerHeight) => {
    console.log(`[IPC] renderer-ready, page height: ${headerHeight}`)
    rendererReady = true
    if (typeof headerHeight === 'number' && headerHeight > 0) {
      VIEW_TOP = Math.round(headerHeight)
    }
    if (tabs.length === 0) {
      console.log(`[renderer-ready] Initialize, create welcome page`)
      createTab(HOME_URL, true)
    } else {
      sendTabsState()
    }
    // 总是发送设置更新，无论是否是首次启动
    mainWindow.webContents.send('settings-updated', browserSettings)
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
    activeTab.view.webContents.loadURL(resolveUrl(url))
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

  ipcMain.on('stop-loading', () => {
    console.log(`[IPC] stop-loading request`)
    const activeTab = getActiveTab()
    if (activeTab) activeTab.view.webContents.stop()
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
    browserSettings = { ...browserSettings, ...settings }
    saveSettings()
    nativeTheme.themeSource = browserSettings.darkMode ? 'dark' : 'light'
    mainWindow.webContents.send('settings-updated', settings)
    event.sender.send('settings-saved-ok')

    const activeTab = getActiveTab()
    if (activeTab && activeTab.view && !activeTab.view.webContents.isDestroyed()) {
      activeTab.view.webContents.reload()
    }
  })

  ipcMain.on('get-settings', (event) => {
    console.log('[IPC] get-settings requested')
    event.sender.send('settings-loaded', browserSettings)
  })

  ipcMain.on('open-download-history', () => {
    console.log('[IPC] open-download-history requested')
    // 在新标签页中打开下载历史页面
    const downloadHistoryUrl = `data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>下载历史</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { 
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { 
      font-size: 24px; 
      margin-bottom: 24px; 
      color: #333;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .download-item {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e9ecef;
      transition: background 0.2s ease;
    }
    .download-item:hover {
      background: #f8f9fa;
    }
    .download-item:last-child {
      border-bottom: none;
    }
    .download-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      margin-right: 16px;
      flex-shrink: 0;
      font-size: 18px;
    }
    .download-icon.completed {
      background: #d4edda;
      color: #155724;
    }
    .download-icon.failed {
      background: #f8d7da;
      color: #721c24;
    }
    .download-icon.downloading {
      background: #d1ecf1;
      color: #0c5460;
    }
    .download-info {
      flex: 1;
      min-width: 0;
    }
    .download-filename {
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
      word-break: break-all;
    }
    .download-details {
      font-size: 12px;
      color: #666;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .download-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .download-action-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    }
    .download-action-btn.open {
      background: #0066cc;
      color: white;
    }
    .download-action-btn.open:hover {
      background: #0052a3;
    }
    .download-action-btn.delete {
      background: #dc3545;
      color: white;
    }
    .download-action-btn.delete:hover {
      background: #c82333;
    }
    .no-downloads {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }
    .no-downloads i {
      font-size: 64px;
      margin-bottom: 16px;
      display: block;
      opacity: 0.5;
    }
    .clear-all-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 20px;
      transition: background 0.2s ease;
    }
    .clear-all-btn:hover {
      background: #c82333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1><i class="fas fa-history"></i>下载历史</h1>
    <div id="downloadHistoryBody">
      <!-- 下载历史内容将在这里动态生成 -->
    </div>
    <button class="clear-all-btn" onclick="clearAllDownloads()">清空所有记录</button>
  </div>

  <script>
    // 从localStorage加载下载历史
    let downloadHistory = []
    
    function loadDownloadHistory() {
      const saved = localStorage.getItem('downloadHistory')
      if (saved) {
        downloadHistory = JSON.parse(saved)
      }
      renderDownloadHistory()
    }
    
    function saveDownloadHistory() {
      localStorage.setItem('downloadHistory', JSON.stringify(downloadHistory))
    }
    
    function formatFileSize(bytes) {
      if (bytes === 0) return '未知'
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    }
    
    function formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    }
    
    function renderDownloadHistory() {
      const body = document.getElementById('downloadHistoryBody')
      
      if (downloadHistory.length === 0) {
        body.innerHTML = \`
          <div class="no-downloads">
            <i class="fas fa-download"></i>
            <div>暂无下载记录</div>
          </div>
        \`
        return
      }
      
      body.innerHTML = downloadHistory.map(download => \`
        <div class="download-item">
          <div class="download-icon \${download.status}">
            <i class="fas fa-\${download.status === 'completed' ? 'check' : download.status === 'failed' ? 'times' : 'download'}"></i>
          </div>
          <div class="download-info">
            <div class="download-filename" title="\${download.filename}">\${download.filename}</div>
            <div class="download-details">
              <span>大小: \${formatFileSize(download.size)}</span>
              <span>时间: \${formatDate(download.timestamp)}</span>
              <span>来源: \${new URL(download.url).hostname}</span>
            </div>
          </div>
          <div class="download-actions">
            \${download.status === 'completed' ? \`<button class="download-action-btn open" onclick="openDownloadFile('\${download.path.replace(/\\\\\\\\/g, '\\\\\\\\')}')">打开</button>\` : ''}
            <button class="download-action-btn delete" onclick="deleteDownload(\${download.id})">删除</button>
          </div>
        </div>
      \`).join('')
    }
    
    function openDownloadFile(filePath) {
      // 使用Electron的shell模块打开文件所在文件夹
      const { shell } = require('electron')
      shell.showItemInFolder(filePath)
    }
    
    function deleteDownload(id) {
      if (confirm('确定要删除这条下载记录吗？')) {
        downloadHistory = downloadHistory.filter(item => item.id !== id)
        saveDownloadHistory()
        renderDownloadHistory()
      }
    }
    
    function clearAllDownloads() {
      if (confirm('确定要清空所有下载历史记录吗？')) {
        downloadHistory = []
        saveDownloadHistory()
        renderDownloadHistory()
      }
    }
    
    // 页面加载时显示下载历史
    window.addEventListener('DOMContentLoaded', () => {
      loadDownloadHistory()
    })
  </script>
</body>
</html>
    `)}`
    createTab(downloadHistoryUrl, true)
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