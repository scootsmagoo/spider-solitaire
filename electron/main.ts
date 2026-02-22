import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(app.getAppPath(), 'dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!)
  } else {
    void mainWindow.loadFile(join(app.getAppPath(), 'dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
