import {register} from "./modules/_register";
import {Err, Ok, Result} from "ts-results";
import {GameInfo, ParserRegister} from "../class";
import path from "path";
import fs from "fs";
import Downloader from 'nodejs-file-downloader';
import {ipcMain} from 'electron'

interface CookieDatabase {
    [name: string]: string
}

const LOCAL_GAME_LIBRARY = "./games", LOCAL_COOKIE_DATABASE = "./cookies.json"
let cookieDatabase: CookieDatabase = fs.existsSync(LOCAL_COOKIE_DATABASE) ? JSON.parse(fs.readFileSync(LOCAL_COOKIE_DATABASE).toString()) : {}

//初始化全部解析器，返回各自的登录状态
function init(): Array<{ name: string, login: boolean }> {
    let res: Array<{ name: string, login: boolean }> = []
    for (let n of register) {
        const callback = (c: string) => {
            cookieDatabase[n.name] = c
            fs.writeFileSync(LOCAL_COOKIE_DATABASE, JSON.stringify(cookieDatabase, null, 2))
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
        console.log(n.regex)
        if (n.regex.test(url)) {
            regNode = n
            break
        }
    }
    if (regNode == null) return new Err("Error:Can't find parser for this url")

    //进行游戏信息解析
    return regNode.entrance(url)
}

async function downloader(info: GameInfo): Promise<Result<GameInfo, string>> {
    //创建本地目录
    const dir = path.join(LOCAL_GAME_LIBRARY, info.type, `${info.title}_${info.fromSite}_${randomStr()}`)
    fs.mkdirSync(dir)

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
        binFile: downloadedFileName
    }
    ipcMain.emit('download-progress', {
        gameInfo: info,
        percentage: 100
    })

    //保存配置文件
    fs.writeFileSync(path.join(dir, "info.json"), JSON.stringify(info, null, 2))

    return new Ok(info)
}

export default {
    downloader,
    parser,
    init
}
