import {app, BrowserWindow, shell, ipcMain} from 'electron'
import {release} from 'os'
import {join} from 'path'
import {sevenK} from "./downloader";
import {Err} from "ts-results";

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: "./retinue/favicon.ico"
  })

  if (app.isPackaged) {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  } else {
    // 🚧 Use ['ENV_NAME'] avoid vite:define plugin
    const url = `http://${process.env['VITE_DEV_SERVER_HOST']}:${process.env['VITE_DEV_SERVER_PORT']}`

    win.loadURL(url)
    win.webContents.openDevTools()
  }

  // Test active push message to Renderer-process
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

ipcMain.on('parse', async (event, payload) => {
  let reply = false
  setTimeout(() => {
    if (reply) return
    else event.reply('result', new Err("Error:Fetch timeout"))
  }, 5000)
  let res = await sevenK(payload, "isP=false; userWatch=2; username=2612468853; nickname=J3rry; loginfrom=wx; SERVER_ID=f0980091-d9ee5f9f; VUSERID=20220503013741BxY46DCfACi4kepHx2A2EBeJ; Hm_lvt_4f1beaf39805550dd06b5cac412cd19b=1651257273,1651306387,1651392366,1651510165; timekey=bf4a7df2f1da562984d76a1a90d7c401; identity=2612468853; userid=865057103; kk=2612468853; logintime=1651513112; k7_lastlogin=1651513112; avatar=http://sface.7k7kimg.cn/uicons/photo_default_s.png; securitycode=d9046817106fba948ac3313b3fe37e2b; Hm_lpvt_4f1beaf39805550dd06b5cac412cd19b=1651513124")
  reply = true
  event.reply('result', res)
})
