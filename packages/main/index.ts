import {app, BrowserWindow, shell, ipcMain} from 'electron'
import {release} from 'os'
import {join} from 'path'
import manager from "./manager";
import {Err} from "ts-results";
import {GameInfo, List} from "../class";

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
            webviewTag: true,
            plugins: true
        },
        icon: "./retinue/favicon.ico"
    })

    if (app.isPackaged) {
        await win.loadFile(join(__dirname, '../renderer/index.html'))
    } else {
        // 🚧 Use ['ENV_NAME'] avoid vite:define plugin
        const url = `http://${process.env['VITE_DEV_SERVER_HOST']}:${process.env['VITE_DEV_SERVER_PORT']}`

        await win.loadURL(url)
        win.webContents.openDevTools()
    }

    // Test active push message to Renderer-process
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', new Date().toLocaleString())
    })

    // Make all links open with the browser, not with the application
    win.webContents.setWindowOpenHandler(({url}) => {
        if (url.startsWith('https:')) shell.openExternal(url)
        return {action: 'deny'}
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
//被动接收初始化请求
ipcMain.on('init', (event) => {
    event.reply('init-reply', manager.init())
})

//登录与登出
ipcMain.on('login', async (event, payload: string) => {
    let r = await manager.login(payload)
    let replyPayload: { name: string, status: boolean, errorMessage: string }
    if (r.ok) {
        replyPayload = {
            name: payload,
            status: true,
            errorMessage: ""
        }
    } else {
        replyPayload = {
            name: payload,
            status: false,
            errorMessage: r.val
        }
    }
    event.reply('login-reply', replyPayload)
})
ipcMain.on('logout', (e, payload) => {
    manager.logout(payload)
})

//游戏信息解析
ipcMain.on('parse', async (event, payload: string) => {
    let reply = false
    setTimeout(() => {
        if (reply) return
        else event.reply('parse-reply', new Err("Error:Fetch timeout"))
    }, 5000)
    let res = await manager.parser(payload)
    reply = true
    event.reply('parse-reply', res)
})

//下载游戏
ipcMain.on('download', async (event, payload: GameInfo) => {
    let r = await manager.downloader(payload)
    event.reply('download-reply', r)
})

//刷新游戏列表
let gameList: List
ipcMain.on('refresh', async (event) => {
    gameList = manager.readList()
    event.reply('refresh-reply', gameList)
})

//启动游戏
ipcMain.on('launch', (event, payload: { type: string, folder: string }) => {
    manager.launch(payload.type, payload.folder)
        .then(() => {
            event.reply('launch-reply', payload)
        })
})

//信息查询
ipcMain.on('query', (event, payload: { type: string, folder: string }) => {
    event.reply('query-reply', manager.query(payload.type, payload.folder))
})
