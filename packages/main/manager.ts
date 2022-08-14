import {register} from "./modules/_register";
import {Err, None, Ok, Option, Result, Some} from "ts-results";
import {Config, GameInfo, List, LoginStatus, ParserRegister} from "../class";
import path from "path";
import fs from "fs";
import cp from 'child_process'
import Downloader from 'nodejs-file-downloader';
import {BrowserWindow, Menu, MenuItem, MenuItemConstructorOptions, shell} from 'electron'
import express from 'express'
import {getConfig, setConfig} from "./config";
import Ajv from "ajv";
import infoSchema from "./schema/info.json"
import shelljs from "shelljs";

const LOCAL_GAME_LIBRARY = "./games"

const ajv = new Ajv()
const infoValidator = ajv.compile(infoSchema)

let gameList: List = {
    flash: [],
    unity: [],
    h5: []
}
let loadErrors: string[] = []

spawnServer()

//启动服务器
function spawnServer() {
    const app = express()
    app.use((req, res, next) => {
        if (req.path.indexOf('Player.html') != -1 && req.path.indexOf('flash') != -1) {
            //请求Flash的Player页面
            res.sendFile(path.join(process.cwd(), "retinue", "Flash_Web_Player", "Player.html"))
        } else {
            next()
        }
    })
    app.use('/retinue', express.static('retinue'))
    app.use('/games', express.static('games'))
    app.use('/temp', express.static('TEMP/UNZIP-TEMP'))
    app.get('/play/:type/:folder', (req, res) => {
        const {type, folder} = req.params, config = getConfig()
        //查询信息
        const info = query(type, folder)
        //若不存在，返回404
        if (!info.some) {
            res.sendStatus(404)
            return
        }
        const infoConfig = info.val
        //重定向到真实路径
        switch (type) {
            case 'flash':
                res.redirect(`http://localhost:${config.port}/games/flash/${folder}/Player.html?title=${infoConfig.title}&load=${infoConfig.local?.binFile}`)
                break
            case 'unity':
                res.redirect(`http://localhost:${config.port}/retinue/Unity3D_Web_Player/Player.html?title=${infoConfig.title}&load=/games/unity/${folder}/${infoConfig.local?.binFile}`)
                break
        }
    })
    app.listen(getConfig().port)
}

//初始化全部解析器，返回配置和登录状态
function init(): { config: Config, status: LoginStatus[] } {
    let s: LoginStatus[] = [],
        config = getConfig()
    for (let n of register) {
        const callback = (c: string) => {
            saveCookie(n.name, c)
        }
        if (config.cookies.hasOwnProperty(n.name)) {
            n.cookieController.init(config.cookies[n.name], callback)
            s.push({
                name: n.name,
                login: true,
                nickName: n.utils.getNickName(config.cookies[n.name]).unwrapOr("Unknown")
            })
        } else {
            n.cookieController.init(null, callback)
            s.push({
                name: n.name,
                login: false,
                nickName: ""
            })
        }
    }
    return {config, status: s}
}

function saveCookie(name: string, cookie: string | null) {
    let config = getConfig()
    if (cookie == null) {
        delete config.cookies[name]
    } else {
        config.cookies[name] = cookie
    }
    setConfig(config, true)
}

//登录与登出，登录成功返回昵称
async function login(name: string): Promise<Result<string, string>> {
    for (let n of register) {
        if (n.name == name) {
            let r = await n.cookieController.get()
            if (r.err) return r
            saveCookie(name, r.val)
            return new Ok(n.utils.getNickName(r.val).unwrapOr("Unknown"))
        }
    }
    return new Err("Error:Can't find such parser")
}

function logout(name: string) {
    for (let n of register) {
        if (name == n.name) {
            n.cookieController.clear()
            saveCookie(name, null)
        }
    }
}

function randomStr(): string {
    let t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890",
        a = t.length,
        n = "";
    for (let i = 0; i < 5; i++) n += t.charAt(Math.floor(Math.random() * a));
    return n
}

async function parser(url: string): Promise<Result<GameInfo, string>> {
    //搜索url匹配
    let regNode: ParserRegister | null = null
    for (let n of register) {
        if (n.regex.test(url)) {
            regNode = n
            break
        }
    }
    if (regNode == null) return new Err("Error:Can't find parser for this url")

    //封装getID函数
    const getID = (url: string): string => {
        const res = regNode!.utils.parseID(url)
        if (res.ok) return res.val
        else {
            return (new URL(url)).pathname
        }
    }

    //遍历list查询此游戏是否被下载了
    let thisID = getID(url),
        found: GameInfo | null = null;
    for (let type in gameList) {
        for (let game of gameList[type]) {
            if (game.fromSite == regNode.name) {
                if (getID(game.online.originPage) == thisID) {
                    found = game
                    break
                }
                }
            }
        }
    if (found != null) {
        return new Ok(found)
    } else {
        //进行游戏信息解析
        return regNode.entrance(url)
    }
}

async function downloader(info: GameInfo): Promise<Result<GameInfo, string>> {
    //创建本地目录
    const door = `${info.title}_${info.fromSite}_${randomStr()}`
    const dir = path.join(LOCAL_GAME_LIBRARY, info.type, door)
    shelljs.mkdir('-p', dir)

    //下载源文件
    if (info.type != 'h5') {
        const sp = info.online.binUrl.split("/")
        let downloadedFileName: string = sp[sp.length - 1]
        const d = new Downloader({
            url: info.online.binUrl,
            directory: dir,
            headers: {
                'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
                referer: info.online.truePage
            },
            onBeforeSave(finalName: string) {
                downloadedFileName = finalName
            }
        })
        try {
            await d.download();
        } catch (error) {
            console.log(error);
            return new Err("Error:Can't download game file")
        }

        //下载完成
        info.local = {
            binFile: downloadedFileName,
            folder: door
        }
    } else {
        info.local = {
            binFile: info.online.binUrl,
            folder: door
        }
    }

    //下载图标
    if (info.online.icon) {
        const sp = info.online.icon.split("/")
        let iconFileName = sp[sp.length - 1]
        const d = new Downloader({
            url: info.online.icon,
            directory: dir,
            headers: {
                'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
                referer: info.online.originPage
            },
            onBeforeSave(finalName: string) {
                //解析拓展名
                let sp = finalName.split('.')
                let extName = sp[sp.length - 1]
                iconFileName = "icon." + extName
                return iconFileName
            }
        })

        try {
            await d.download();
            info.local.icon = iconFileName
        } catch (error) {
            console.log(error);
            console.log("Can't download icon, ignore")
        }
    }

    //保存配置文件
    fs.writeFileSync(path.join(dir, "info.json"), JSON.stringify(info, null, 2))

    return new Ok(info)
}

//对于某种独立分类生成列表
function geneNaiveList(p: string): GameInfo[] {
    if (!fs.existsSync(p)) return []
    let res: GameInfo[] = [], infoFile: string, infoConfig
    //读取某种目录列表
    let folders = fs.readdirSync(p)
    for (let folder of folders) {
        infoFile = path.join(p, folder, "info.json")
        if (!fs.existsSync(infoFile)) {
            //检查是否为空文件夹
            if (fs.readdirSync(path.join(p, folder)).length == 0) {
                shelljs.rm("-rf", path.join(p, folder))
            } else {
                loadErrors.push("Can't find info config : " + infoFile)
            }
            continue
        }
        infoConfig = JSON.parse(fs.readFileSync(infoFile).toString()) as GameInfo
        if (!infoValidator(infoConfig)) {
            loadErrors.push(`Can't valid ${infoFile} : ${infoValidator.errors ? infoValidator.errors[0].message : "Unknown error"}`)
            infoValidator.errors = null
            continue
        }
        res.push(infoConfig)
    }
    return res
}

function readList(dir?: string): List {
    const target = dir ?? LOCAL_GAME_LIBRARY
    gameList= {
        flash: geneNaiveList(path.join(target, "flash")),
        unity: geneNaiveList(path.join(target, "unity")),
        h5: geneNaiveList(path.join(target, "h5"))
    }
    return gameList
}

function checkDependency(type: 'flash' | 'unity'): boolean {
    if (!getConfig().libCheck) return true
    switch (type) {
        case "flash":
            return fs.existsSync("C:\\Windows\\System32\\Macromed\\Flash\\pepflashplayer.dll") || fs.existsSync("C:\\Windows\\SysWOW64\\Macromed\\Flash\\pepflashplayer.dll")
        case "unity":
            return fs.existsSync("C:\\Program Files\\Unity\\WebPlayer64\\Uninstall.exe") || fs.existsSync("C:\\Program Files\\Unity\\WebPlayer\\Uninstall.exe") || fs.existsSync("C:\\Program Files (x86)\\Unity\\WebPlayer\\Uninstall.exe")
    }
}

function getLoadErrors():Option<string> {
    if (loadErrors.length == 0) return None
    else {
        let msg = ""
        for (let m of loadErrors) {
            msg += m + '\n'
        }
        loadErrors = []
        return new Some(msg)
    }
}

export function addLoadErrors(msg: string) {
    loadErrors.push(msg)
}

function menuConstructor(win: BrowserWindow): Menu {
    let menu = new Menu()
    const submenu: MenuItemConstructorOptions[] = [
        {
            role: 'forceReload',
            label: '刷新'
        },
        {
            role: 'togglefullscreen',
            label: '全屏'
        },
        {
            role: 'toggleDevTools',
            label: '开发者工具'
        },
        {
            label: '退出',
            click: () => {
                win.close()
            }
        }
    ]
    menu.append(new MenuItem({
        label: '选项',
        submenu
    }))
    return menu
}

async function launch(type: string, folder: string, method: 'normal' | 'backup' | 'origin'): Promise<boolean> {
    return new Promise(async (resolve) => {
        const infoConfig = JSON.parse(fs.readFileSync(path.join(LOCAL_GAME_LIBRARY, type, folder, "info.json")).toString()) as GameInfo,
            config = getConfig()
        switch (infoConfig.type) {
            case "flash":
                if (method == 'backup') {
                    if (!checkDependency('flash')) {
                        resolve(false)
                    } else {
                        await openWithBrowser(config.browser.flash, `http://localhost:${config.port}/play/flash/${folder}`)
                        resolve(true)
                    }
                } else if (method == 'normal') {
                    cp.exec(`"${path.join("retinue", "flashplayer_sa.exe")}" "${path.join(LOCAL_GAME_LIBRARY, type, folder, infoConfig.local?.binFile ?? '')}"`, () => {
                        resolve(true)
                    })
                } else if (method == 'origin') {
                    if (config.smartSniffing.enable) {
                        await openWithBrowser(config.browser.flash, "", config.smartSniffing.arg + config.smartSniffing.port.toString())
                    } else {
                        await openWithBrowser(config.browser.flash, infoConfig.online.truePage + '#flash-collector-0?title=' + infoConfig.title)
                    }
                    resolve(true)
                }
                break
            case "unity":
                if (!checkDependency('unity')) {
                    resolve(false)
                } else {
                    if (method == 'normal') {
                        await openWithBrowser(config.browser.unity, `http://localhost:${config.port}/play/unity/${folder}`)
                        resolve(true)
                    } else if (method == 'origin') {
                        await openWithBrowser(config.browser.unity, infoConfig.online.truePage + '#flash-collector-0?title=' + infoConfig.title)
                        resolve(true)
                    }
                }
                break
            case "h5":
                if (method == 'origin') {
                    await openWithBrowser(config.browser.h5, infoConfig.online.truePage + '#flash-collector-0?title=' + infoConfig.title)
                    resolve(true)
                } else if (method == 'normal') {
                    const win = new BrowserWindow({
                        width: 1200,
                        height: 800,
                        icon: infoConfig.local?.icon ? `./games/${infoConfig.type}/${infoConfig.local.folder}/${infoConfig.local.icon}` : undefined
                    })
                    win.setMenu(menuConstructor(win))
                    win.webContents.once('did-stop-loading', () => {
                        win.setTitle(infoConfig.title)
                    })
                    win.on('close', () => {
                        resolve(true)
                    })
                    await win.loadURL(infoConfig.online.binUrl, {
                        httpReferrer: infoConfig.online.truePage,
                        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
                    })
                }
                break
        }
        //记录到recentLaunch
        const id = type + ";" + folder
        let entry: { id: string, freq: number } | null = null, res: Config['recentLaunch'] = []
        for (let n of config.recentLaunch) {
            if (n.id == id) {
                entry = n
            } else {
                res.push(n)
            }
        }
        if (entry) {
            res.unshift({
                id,
                freq: entry.freq + 1
            })
        } else {
            res.unshift({
                id,
                freq: 1
            })
        }
        config.recentLaunch = res
        setConfig(config, false)
    })
}

const infoCache = new Map<string, GameInfo>()

function query(type: string, folder: string): Option<GameInfo> {
    const key = type + folder
    let q = infoCache.get(key)
    if (q != undefined) {
        return new Some(q)
    } else {
        const p = path.join(LOCAL_GAME_LIBRARY, type, folder, "info.json")
        if (!fs.existsSync(p)) {
            return None
        }
        let info = JSON.parse(fs.readFileSync(p).toString()) as GameInfo
        if (infoValidator(info)) {
            infoCache.set(key, info)
            return new Some(info)
        } else {
            infoValidator.errors = null
            return None
        }
    }
}

function rename(type: string, folder: string) {
    const key = type + folder
    infoCache.delete(key)
}

async function install(type: 'flash' | 'unity'): Promise<string> {
    return new Promise((resolve) => {
        if (type == 'flash') {
            cp.exec(`"${path.join('retinue', 'Flash_Web_Player', 'Flash_Player_v32.0.0.465_NPAPI_Final.exe')}" /ai /gm2`, () => {
                cp.exec(`"${path.join('retinue', 'Flash_Web_Player', 'Flash_Player_v32.0.0.465_PPAPI_Final.exe')}" /ai /gm2`, () => {
                    resolve("Flash Player 安装完成")
                })
            })
        } else {
            cp.exec(`"${path.join('retinue', 'Unity3D_Web_Player', 'installer', 'UnityWebPlayer.exe')}" /S`, () => {
                if (process.arch == "x64") {
                    cp.exec(`"${path.join('retinue', 'Unity3D_Web_Player', 'installer', 'UnityWebPlayer64.exe')}" /S`, () => resolve("Unity3D Web Player 安装完成"))
                } else resolve("Unity3D Web Player 安装完成")
            })
        }
    })
}

function localSearch(text: string): GameInfo[] {
    let res: GameInfo[] = []
    for (let type in gameList) {
        for (let game of gameList[type]) {
            if (game.title.toLocaleLowerCase().indexOf(text.toLocaleLowerCase()) >= 0) {
                res.push(game)
            }
        }
    }
    return res
}

async function del(type: string, folder: string): Promise<boolean> {
    //移动至回收站
    try {
        await shell.trashItem(path.join(process.cwd(), "games", type, folder))
    } catch (e) {
        return false
    }
    //从最近启动中删除
    const id = type + ";" + folder
    let config = getConfig(), res: Config['recentLaunch'] = []
    for (let game of config.recentLaunch) {
        if (game.id != id) res.push(game)
    }
    config.recentLaunch = res
    setConfig(config, false)
    return true
}

async function openWithBrowser(browser: string, url: string, arg?: string): Promise<void> {
    if (browser == "") {
        //使用默认方式打开
        return shell.openExternal(encodeURI(url))
    } else {
        return new Promise((res) => {
            let cmd = `"${browser}"`
            if (url != "") cmd += ` "${encodeURI(url)}"`
            if (arg) cmd += " " + arg
            console.log(cmd)
            let proc = cp.exec(cmd)
            setTimeout(() => {
                proc.kill() //此处是为了兼容傻逼搜狗浏览器而设计的杀进程，写的什么狗屁玩意(o_ _)ﾉ
                res()
            }, 2000)
        })
    }
}


export default {
    downloader,
    parser,
    init,
    login,
    logout,
    readList,
    launch,
    query,
    rename,
    install,
    localSearch,
    del,
    getLoadErrors,
    openWithBrowser
}
