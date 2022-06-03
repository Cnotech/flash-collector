import path from 'path'
import fs from 'fs'
import {GameInfo, ProgressEnable} from "../class";
import {getConfig} from "./config";
import {getBrowserNode} from "./browser";
import {Err, Ok, Result} from "ts-results";
import {BrowserWindow} from "electron";

const shelljs = require('shelljs')

const ROAMING_APPDATA = process.env['APPDATA'] ?? ""

let targetInfo = {
    FLASH_LOCAL_WITH_NET: "",
    FLASH_LOCALHOST: "",
    FLASH_BROWSER: "",
    UNITY_WEB_PLAYER_PREFS: ""
}

function initProgressModule(): ProgressEnable {
    let res: ProgressEnable = {
        flashIndividual: false,
        flashBrowser: false,
        unity: false,
        h5Import: false
    }
    let config = getConfig()
    //判断flash
    const SharedObjects = path.join(ROAMING_APPDATA, 'Macromedia', 'Flash Player', '#SharedObjects')
    const CwdAppend = process.cwd().split('\\').slice(1).concat(['games', 'flash'])
    if (fs.existsSync(SharedObjects)) {
        //遍历随机文件夹
        let p1, p2
        for (let randomFolder of fs.readdirSync(SharedObjects)) {
            p1 = path.join(SharedObjects, randomFolder, '#localWithNet', ...CwdAppend)
            p2 = path.join(SharedObjects, randomFolder, 'localhost', ...CwdAppend)
            if (fs.existsSync(p1) || fs.existsSync(p2)) {
                res.flashIndividual = true
                targetInfo.FLASH_LOCAL_WITH_NET = p1
                targetInfo.FLASH_LOCALHOST = p2
            }
        }
    }
    let browserFlashCacheLocation = getBrowserNode(config.browser.flash).location?.flashCache
    if (browserFlashCacheLocation && fs.existsSync(browserFlashCacheLocation) && fs.statSync(browserFlashCacheLocation).isDirectory()) {
        //遍历随机文件夹
        for (let randomFolder of fs.readdirSync(browserFlashCacheLocation)) {
            if (fs.existsSync(path.join(browserFlashCacheLocation, randomFolder, '#localWithNet')) || fs.existsSync(path.join(browserFlashCacheLocation, randomFolder, 'localhost'))) {
                res.flashBrowser = true
                targetInfo.FLASH_BROWSER = path.join(browserFlashCacheLocation, randomFolder)
            }
        }
    }

    //判断unity
    let p3 = path.join(ROAMING_APPDATA, 'Unity', 'WebPlayerPrefs')
    if (fs.existsSync(p3)) {
        targetInfo.UNITY_WEB_PLAYER_PREFS = p3
        res.unity = true
    }

    //判断h5启动浏览器是否支持CDP
    if (getBrowserNode(config.browser.h5).trait.debug) {
        res.h5Import = true
    }

    // console.log(targetInfo)
    return res
}

function searchInP(targetFolder: string, p: string, type: "flash" | "unity"): string | null {
    if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) return null
    //裁切关键词
    let sp = targetFolder.split("_")
    //生成匹配正则
    let keyword = encodeURI(`${sp[1]}_${sp[2]}`).replace(/%/g, type == "flash" ? "#" : "_")
    if (type == "unity") keyword = keyword.replace(/_/g, "_5f").toLowerCase()
    //扫描文件列表
    let finalPath: string, legal: boolean
    for (let name of fs.readdirSync(p)) {
        finalPath = path.join(p, name)
        legal = fs.statSync(finalPath).isDirectory()
        if (type == "unity") legal = !legal
        if (name.indexOf(keyword) > -1 && legal) {
            return finalPath
        }
    }
    return null
}

function copyFolder(source: string, target: string): boolean {
    if (fs.existsSync(target)) shelljs.rm("-rf", target)
    if (fs.existsSync(target)) return false
    shelljs.mkdir(target)
    shelljs.cp("-R", source, path.join(target, path.basename(source)))
    return fs.existsSync(target)
}

function copyFile(source: string, target: string): boolean {
    if (fs.existsSync(target)) shelljs.rm("-rf", target)
    if (fs.existsSync(target)) return false
    shelljs.mkdir(target)
    shelljs.cp(source, path.join(target, path.basename(source)))
    return fs.existsSync(target)
}

function writeJson(json: any, targetFolder: string, fileName: string): boolean {
    const finalPath = path.join(targetFolder, fileName)
    if (fs.existsSync(finalPath)) shelljs.rm(finalPath)
    if (fs.existsSync(finalPath)) return false
    if (!fs.existsSync(targetFolder)) shelljs.mkdir(targetFolder)
    fs.writeFileSync(finalPath, JSON.stringify(json, null, 2))
    return fs.existsSync(finalPath)
}

async function backup(info: GameInfo): Promise<Result<null, string>> {
    if (info.local == null) return new Err("Error:Fatal,no local information provided")

    //解析备份目标目录
    let backupSource = null
    const backupTarget = path.join(process.cwd(), "games", info.type, info.local.folder, "_FC_PROGRESS_BACKUP_")
    switch (info.type) {
        case "flash":
            //查找两个位置
            if (targetInfo.FLASH_LOCALHOST != "") {
                let s = searchInP(info.local.folder, targetInfo.FLASH_LOCALHOST, "flash")
                if (s != null) backupSource = s
            }
            if (backupSource == null && targetInfo.FLASH_LOCAL_WITH_NET != "") {
                let s = searchInP(info.local.folder, targetInfo.FLASH_LOCAL_WITH_NET, "flash")
                if (s != null) backupSource = s
            }
            if (backupSource == null) return new Err("进度备份失败：没有找到进度文件；暂不支持兼容模式的进度备份")

            //复制目录
            if (copyFolder(backupSource, backupTarget)) {
                return new Ok(null)
            } else {
                return new Err("进度备份失败：无法拷贝进度文件")
            }
        case "unity":
            if (targetInfo.UNITY_WEB_PLAYER_PREFS != "") {
                let s = searchInP(info.local.folder, path.join(targetInfo.UNITY_WEB_PLAYER_PREFS, "localhost"), "unity")
                if (s != null) backupSource = s
            }
            if (backupSource == null) return new Err("进度备份失败：没有找到进度文件")

            //复制文件
            if (copyFile(backupSource, backupTarget)) {
                return new Ok(null)
            } else {
                return new Err("进度备份失败：无法拷贝进度文件")
            }
        case "h5":
            return new Promise(async res => {
                const win = new BrowserWindow({
                    width: 30,
                    height: 20
                })
                win.hide()
                win.webContents.once('did-stop-loading', async () => {
                    //读取localStorage
                    let ls = await win.webContents.executeJavaScript('({...localStorage});', true)
                    if (writeJson(ls, backupTarget, "localStorage.json")) {
                        res(new Ok(null))
                    } else {
                        res(new Err("进度备份失败：无法写入进度文件"))
                    }
                })
                await win.loadURL(info.online.binUrl, {
                    httpReferrer: info.online.truePage,
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
                })
            })
    }
    return new Err("Error:Fatal,unknown game type : " + info.type)
}

export {
    initProgressModule,
    backup
}
