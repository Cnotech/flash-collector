import {register} from "./modules/_register";
import {Err, Ok, Result} from "ts-results";
import {GameInfo, List, ParserRegister} from "../class";
import path from "path";
import fs from "fs";
import cp from 'child_process'
import Downloader from 'nodejs-file-downloader';
import {BrowserWindow, ipcMain} from 'electron'
import express from 'express'

const shell = require('shelljs')

const LOCAL_GAME_LIBRARY = "./games", LOCAL_COOKIE_DATABASE = "./cookies.json", PORT = 3000

interface CookieDatabase {
    [name: string]: string
}

let cookieDatabase: CookieDatabase = fs.existsSync(LOCAL_COOKIE_DATABASE) ? JSON.parse(fs.readFileSync(LOCAL_COOKIE_DATABASE).toString()) : {}
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
app.listen(PORT)

//初始化全部解析器，返回各自的登录状态
function init(): Array<{ name: string, login: boolean }> {
    let res: Array<{ name: string, login: boolean }> = []
    for (let n of register) {
        const callback = (c: string) => {
            saveCookie(n.name, c)
        }
        if (cookieDatabase.hasOwnProperty(n.name)) {
            n.cookieController.init(cookieDatabase[n.name], callback)
            res.push({name: n.name, login: true})
        } else {
            n.cookieController.init(null, callback)
            res.push({name: n.name, login: false})
        }
    }
    return res
}

function saveCookie(name: string, cookie: string | null) {
    if (cookie == null) {
        delete cookieDatabase[name]
    } else {
        cookieDatabase[name] = cookie
    }
    console.log(cookieDatabase)
    fs.writeFileSync(LOCAL_COOKIE_DATABASE, JSON.stringify(cookieDatabase, null, 2))
}

//登录与登出
async function login(name: string): Promise<Result<null, string>> {
    for (let n of register) {
        if (n.name == name) {
            let r = await n.cookieController.get()
            if (r.err) return r
            saveCookie(name, r.val)
            return new Ok(null)
        }
    }
    return new Err("Error:Can't find such parser")
}

function logout(name: string) {
    console.log(name)
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
    let found: GameInfo | null = null, thisID = regNode.parseID(url).unwrap()
    for (let type in gameList) {
        for (let game of gameList[type]) {
            if (game.fromSite == regNode.name) {
                let idRes = regNode.parseID(game.online.originPage)
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
    const sp = info.online.binUrl.split("/")
    let downloadedFileName: string = sp[sp.length - 1]
    const d = new Downloader({
        url: info.online.binUrl,
        directory: dir,
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

async function launch(type: string, folder: string, backup: boolean): Promise<void> {
    return new Promise(async (resolve) => {
        const infoConfig = JSON.parse(fs.readFileSync(path.join(LOCAL_GAME_LIBRARY, type, folder, "info.json")).toString()) as GameInfo
        switch (infoConfig.type) {
            case "flash":
                if (backup) {
                    cp.exec("start " + encodeURI(`http://localhost:${PORT}/games/flash/${folder}/Player.html?load=${infoConfig.local?.binFile}`), () => resolve())
                } else {
                    cp.exec(`"${path.join("retinue", "flashplayer_sa.exe")}" "${path.join(LOCAL_GAME_LIBRARY, type, folder, infoConfig.local?.binFile ?? '')}"`, () => {
                        resolve()
                    })
                }
                break
            case "unity":
                cp.exec("start " + encodeURI(`http://localhost:${PORT}/retinue/Unity3D_Web_Player/Player.html?load=/games/unity/${folder}/${infoConfig.local?.binFile}`), () => resolve())
                break
            case "h5":
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

export default {
    downloader,
    parser,
    init,
    login,
    logout,
    readList,
    launch,
    query
}
