const {
  app,
  BrowserWindow,
  protocol,
  net,
  shell,
  ipcMain,
  desktopCapturer,
  dialog,
  session,
} = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const ROOT = path.join(__dirname, '..', 'dist')
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'openshot',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
])
let window
function trusted(event) {
  return event.senderFrame?.url?.startsWith('openshot://editor/')
}
async function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 720,
    minHeight: 560,
    title: 'OpenShot',
    backgroundColor: '#151719',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(github\.com|unsplash\.com)\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('openshot://editor/')) event.preventDefault()
  })
  await window.loadURL('openshot://editor/index.html')
}
app.whenReady().then(async () => {
  protocol.handle('openshot', (request) => {
    const url = new URL(request.url)
    if (url.hostname !== 'editor') return new Response('Not found', { status: 404 })
    const file = path.resolve(
      ROOT,
      '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
    )
    if (!file.startsWith(ROOT + path.sep)) return new Response('Not found', { status: 404 })
    return net
      .fetch(pathToFileURL(file).href)
      .then((response) => {
        const headers = new Headers(response.headers)
        headers.set(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.unsplash.com; media-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://images.unsplash.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'",
        )
        return new Response(response.body, { status: response.status, headers })
      })
      .catch(() => new Response('Not found', { status: 404 }))
  })
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) =>
    callback(permission === 'clipboard-sanitized-write'),
  )
  ipcMain.handle('capture', async (event) => {
    if (!trusted(event)) throw new Error('Untrusted caller')
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 3840, height: 2160 },
      fetchWindowIcons: false,
    })
    const available = sources
      .filter((s) => !s.thumbnail.isEmpty() && s.name !== 'OpenShot')
      .slice(0, 12)
    if (!available.length) {
      await dialog.showMessageBox(window, {
        type: 'info',
        message: 'No screens are available',
        detail: 'Allow screen recording for OpenShot in your system settings, then try again.',
      })
      return null
    }
    const result = await dialog.showMessageBox(window, {
      type: 'question',
      title: 'Capture screen',
      message: 'Choose a screen or window',
      buttons: [...available.map((s) => s.name), 'Cancel'],
      defaultId: 0,
      cancelId: available.length,
      noLink: true,
    })
    if (result.response >= available.length) return null
    return available[result.response].thumbnail.toDataURL()
  })
  await createWindow()
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) void createWindow()
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
