import {register} from "./modules/_register";
import {Err, Ok, Result} from "ts-results";
import {GameInfo, List, LoginStatus, ParserRegister} from "../class";
import path from "path";
import fs from "fs";
import cp from 'child_process'
import Downloader from 'nodejs-file-downloader';
import {BrowserWindow, ipcMain} from 'electron'
import express from 'express'
import {Config, getConfig, setConfig} from "./config";

const shell = require('shelljs')

const LOCAL_GAME_LIBRARY = "./games"

let freshList = true, gameList: List = {
    flash: geneNaiveList(path.join(LOCAL_GAME_LIBRARY, "flash")),
    unity: geneNaiveList(path.join(LOCAL_GAME_LIBRARY, "unity")),
    h5: geneNaiveList(path.join(LOCAL_GAME_LIBRARY, "h5"))
}

//建立静态服务器
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
app.listen(getConfig().port)

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
    setConfig(config)
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

    //遍历list查询此游戏是否被下载了
    let found: GameInfo | null = null, thisID = regNode.utils.parseID(url).unwrap()
    for (let type in gameList) {
        for (let game of gameList[type]) {
            if (game.fromSite == regNode.name) {
                let idRes = regNode.utils.parseID(game.online.originPage)
                if (idRes.err) {
                    console.log(`Warning:Fatal, can't parse id for local game ${type}/${game.local?.folder} with module ${regNode.name}`)
                } else if (idRes.val == thisID) {
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
    shell.mkdir('-p', dir)

    //下载源文件
    if (info.type != 'h5') {
        const sp = info.online.binUrl.split("/")
        let downloadedFileName: string = sp[sp.length - 1]
        const d = new Downloader({
            url: info.online.binUrl,
            directory: dir,
            headers: {
                'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
                referer: info.online.originPage
            },
            onProgress(percentage: string) {
                ipcMain.emit('download-progress', {
                    gameInfo: info,
                    percentage
                })
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
    ipcMain.emit('download-progress', {
        gameInfo: info,
        percentage: 100
    })

    //保存配置文件
    fs.writeFileSync(path.join(dir, "info.json"), JSON.stringify(info, null, 2))

    return new Ok(info)
}

//对于某种独立分类生成列表
function geneNaiveList(p: string): GameInfo[] {
    if (!fs.existsSync(p)) return []
    let res: GameInfo[] = [], infoFile: string
    //读取某种目录列表
    let folders = fs.readdirSync(p)
    for (let folder of folders) {
        infoFile = path.join(p, folder, "info.json")
        if (!fs.existsSync(infoFile)) {
            console.log("Warning:Can't find info config : " + infoFile)
            continue
        }
        res.push(JSON.parse(fs.readFileSync(infoFile).toString()))
    }
    return res
}

function readList(): List {
    if (!freshList) {
        gameList = {
            flash: geneNaiveList(path.join(LOCAL_GAME_LIBRARY, "flash")),
            unity: geneNaiveList(path.join(LOCAL_GAME_LIBRARY, "unity")),
            h5: geneNaiveList(path.join(LOCAL_GAME_LIBRARY, "h5"))
        }
    } else {
        freshList = false
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

async function launch(type: string, folder: string, backup: boolean): Promise<boolean> {
    return new Promise(async (resolve) => {
        const infoConfig = JSON.parse(fs.readFileSync(path.join(LOCAL_GAME_LIBRARY, type, folder, "info.json")).toString()) as GameInfo,
            config = getConfig()
        switch (infoConfig.type) {
            case "flash":
                if (backup) {
                    if (!checkDependency('flash')) {
                        resolve(false)
                    } else {
                        cp.exec("start " + encodeURI(`http://localhost:${config.port}/games/flash/${folder}/Player.html?load=${infoConfig.local?.binFile}`), () => resolve(true))
                    }
                } else {
                    cp.exec(`"${path.join("retinue", "flashplayer_sa.exe")}" "${path.join(LOCAL_GAME_LIBRARY, type, folder, infoConfig.local?.binFile ?? '')}"`, () => {
                        resolve(true)
                    })
                }
                break
            case "unity":
                if (!checkDependency('unity')) {
                    resolve(false)
                } else {
                    cp.exec("start " + encodeURI(`http://localhost:${config.port}/retinue/Unity3D_Web_Player/Player.html?load=/games/unity/${folder}/${infoConfig.local?.binFile}`), () => resolve(true))
                }
                break
            case "h5":
                if (backup) {
                    cp.exec("start " + encodeURI(infoConfig.online.binUrl), () => resolve(true))
                } else {
                    const win = new BrowserWindow({width: 1200, height: 800})
                    await win.loadURL(infoConfig.online.binUrl, {
                        httpReferrer: infoConfig.online.truePage,
                        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
                    })
                    win.on('close', () => {
                        resolve(true)
                    })
                }
                break
        }
    })
}

const infoCache = new Map<string, GameInfo>()

function query(type: string, folder: string): GameInfo {
    const key = type + folder
    let q = infoCache.get(key)
    if (q != undefined) {
        return q
    } else {
        let info = JSON.parse(fs.readFileSync(path.join(LOCAL_GAME_LIBRARY, type, folder, "info.json")).toString())
        infoCache.set(key, info)
        return info
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
            if (process.arch == "x64") {
                cp.exec(`"${path.join('retinue', 'Unity3D_Web_Player', 'installer', 'UnityWebPlayer64.exe')}" /S`, () => resolve("Unity3D Web Player 安装完成"))
            } else {
                cp.exec(`"${path.join('retinue', 'Unity3D_Web_Player', 'installer', 'UnityWebPlayer.exe')}" /S`, () => resolve("Unity3D Web Player 安装完成"))
            }
        }
    })
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
    install
}
