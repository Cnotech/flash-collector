import path from 'path'
import fs from 'fs'
import {GameInfo, ProgressEnable} from "../class";
import {getConfig} from "./config";
import {getBrowserNode} from "./browser";
import {Err, None, Ok, Option, Result, Some} from "ts-results";
import {BrowserWindow} from "electron";
import Ajv from "ajv";
import backupSchema from "./schema/backup.json";
import os from "os";
import cp from "child_process"
import shelljs from "shelljs";

const ajv = new Ajv()
const backupValidator = ajv.compile(backupSchema)

const ROAMING_APPDATA = process.env['APPDATA'] ?? ""

let targetInfo = {
    FLASH_LOCAL_WITH_NET: "",
    FLASH_LOCALHOST: "",
    FLASH_BROWSER: "",
    UNITY_WEB_PLAYER_PREFS: ""
}

function validBackupJson(json: any): Result<null, string> {
    let r = backupValidator(json)
    if (r) {
        return new Ok(null)
    } else {
        let m = backupValidator.errors ? JSON.stringify(backupValidator.errors[0]) : "No error description"
        backupValidator.errors = null
        return new Err(m)
    }
}

//记录是否执行过CreateProgressCache
let launchedCreateProgressCache = false

function initProgressModule(noCreateProgressCache?: boolean): ProgressEnable {
    let res: ProgressEnable = {
        flashIndividual: false,
        flashBrowser: false,
        unity: false,
        h5Import: false
    }
    let config = getConfig()
    if (launchedCreateProgressCache) noCreateProgressCache = true
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
    //如果找不到进度则尝试调用示例swf文件创建一个进度，然后重试
    if (!res.flashIndividual && !noCreateProgressCache) {
        launchedCreateProgressCache = true
        shelljs.mkdir("-p", path.join("games", "flash", "_FC_TEMP_"))
        shelljs.cp(path.join("retinue", "createProgressCache.swf"), path.join("games", "flash", "_FC_TEMP_"))
        cp.execSync(`"${path.join("retinue", "flashplayer_sa.exe")}" "${path.join("games", "flash", "_FC_TEMP_", "createProgressCache.swf")}"`)
        shelljs.rm("-rf", path.join("games", "flash", "_FC_TEMP_"))
        return initProgressModule(true)
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
    // if (fs.existsSync(p3)) {
    //     targetInfo.UNITY_WEB_PLAYER_PREFS = p3
    //     res.unity = true
    // }
    targetInfo.UNITY_WEB_PLAYER_PREFS = p3
    res.unity = true

    //判断h5启动浏览器是否支持CDP
    if (getBrowserNode(config.browser.h5).trait.debug) {
        res.h5Import = true
    }

    // console.log(targetInfo)
    // console.log(res)
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
    const final = path.join(target, path.basename(source))
    if (fs.existsSync(final)) shelljs.rm("-rf", final)
    if (fs.existsSync(final)) return false
    if (!fs.existsSync(target)) shelljs.mkdir(target)
    shelljs.cp("-R", source, target)
    return fs.existsSync(final)
}

function copyFile(source: string, target: string): boolean {
    const final = path.join(target, path.basename(source))
    if (fs.existsSync(final)) shelljs.rm("-rf", final)
    if (fs.existsSync(final)) return false
    if (!fs.existsSync(target)) shelljs.mkdir(target)
    shelljs.cp(source, target)
    return fs.existsSync(final)
}

function writeJson(json: any, targetFolder: string, fileName: string): boolean {
    const finalPath = path.join(targetFolder, fileName)
    if (fs.existsSync(finalPath)) shelljs.rm(finalPath)
    if (fs.existsSync(finalPath)) return false
    if (!fs.existsSync(targetFolder)) shelljs.mkdir(targetFolder)
    fs.writeFileSync(finalPath, JSON.stringify(json, null, 2))
    return fs.existsSync(finalPath)
}

async function backup(info: GameInfo, force?: boolean): Promise<Result<null, string>> {
    if (info.local == null) return new Err("Error:Fatal,no local information provided")

    //解析备份目标目录
    let backupSource = null
    const backupTarget = path.join(process.cwd(), "games", info.type, info.local.folder, "_FC_PROGRESS_BACKUP_")
    //处理来自他人创建的进度，显示覆盖提示
    const backupJson = path.join(backupTarget, "backup.json")
    if (fs.existsSync(backupJson)) {
        let backupJsonData = JSON.parse(fs.readFileSync(backupJson).toString())
        if (validBackupJson(backupJsonData) && backupJsonData.createdBy != os.hostname() && !force) {
            return new Err(`OVERWRITE_CONFIRM:${backupJsonData.createdBy}`)
        }
    }
    switch (info.type) {
        case "flash":
            //查找两个位置
            let originLocation = ""
            if (targetInfo.FLASH_LOCALHOST != "") {
                let s = searchInP(info.local.folder, targetInfo.FLASH_LOCALHOST, "flash")
                if (s != null) {
                    backupSource = s
                    originLocation = "%FLASH_LOCALHOST%"
                }
            }
            if (backupSource == null && targetInfo.FLASH_LOCAL_WITH_NET != "") {
                let s = searchInP(info.local.folder, targetInfo.FLASH_LOCAL_WITH_NET, "flash")
                if (s != null) {
                    backupSource = s
                    originLocation = "%FLASH_LOCAL_WITH_NET%"
                }
            }
            if (backupSource == null) return new Err("进度备份失败：没有找到进度文件；暂不支持兼容模式的进度备份")

            //复制目录
            if (!copyFolder(backupSource, backupTarget)) {
                return new Err("进度备份失败：无法拷贝进度文件")
            }
            //写信息
            if (writeJson({
                originLocation,
                createdBy: os.hostname()
            }, backupTarget, "backup.json")) {
                return new Ok(null)
            } else {
                return new Err("进度备份失败：无法写入配置信息")
            }
        case "unity":
            if (targetInfo.UNITY_WEB_PLAYER_PREFS != "") {
                let s = searchInP(info.local.folder, path.join(targetInfo.UNITY_WEB_PLAYER_PREFS, "localhost"), "unity")
                if (s != null) backupSource = s
            }
            if (backupSource == null) return new Err("进度备份失败：没有找到进度文件")

            //复制文件
            if (!copyFile(backupSource, backupTarget)) {
                return new Err("进度备份失败：无法拷贝进度文件")
            }
            //写信息
            if (writeJson({
                originLocation: "%UNITY_WEB_PLAYER_PREFS%/localhost",
                createdBy: os.hostname()
            }, backupTarget, "backup.json")) {
                return new Ok(null)
            } else {
                return new Err("进度备份失败：无法写入配置信息")
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
                    win.close()
                    //写localStorage.json
                    if (!writeJson(ls, backupTarget, "localStorage.json")) {
                        res(new Err("进度备份失败：无法写入进度文件"))
                    }
                    //写信息
                    if (writeJson({
                        originLocation: "localStorage",
                        createdBy: os.hostname()
                    }, backupTarget, "backup.json")) {
                        res(new Ok(null))
                    } else {
                        res(new Err("进度备份失败：无法写入配置信息"))
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

function parseOriginLocation(pattern: string): string {
    return pattern
        .replace("%FLASH_LOCALHOST%", targetInfo.FLASH_LOCALHOST)
        .replace("%FLASH_LOCAL_WITH_NET%", targetInfo.FLASH_LOCAL_WITH_NET)
        .replace("%UNITY_WEB_PLAYER_PREFS%", targetInfo.UNITY_WEB_PLAYER_PREFS)
}

async function shortLaunch(swf: string): Promise<null> {
    return new Promise(res => {
        let p = cp.execFile(path.join("retinue", "flashplayer_sa.exe"), [swf], () => {
            res(null)
        })
        setTimeout(() => {
            p.kill()
        }, 3000)
    })
}

async function restore(info: GameInfo, force?: boolean): Promise<Result<null, string>> {
    if (info.local == null) return new Err("Error:Fatal,no local information provided")

    //读取当前进度状态
    let pEnable = initProgressModule()

    //读取备份信息
    const backupRoot = path.join(process.cwd(), "games", info.type, info.local.folder, "_FC_PROGRESS_BACKUP_")
    if (!fs.existsSync(backupRoot + "/backup.json")) {
        return new Err("进度恢复失败：当前没有备份")
    }
    let backupJsonData = JSON.parse(fs.readFileSync(backupRoot + "/backup.json").toString()) as {
        originLocation: string,
        createdBy: string
    }
    let v = validBackupJson(backupJsonData)
    if (v.err) {
        return new Err("进度恢复失败：备份信息校验错误：" + v.val)
    }

    //处理来自他人创建的进度，显示覆盖提示
    if (backupJsonData.createdBy != os.hostname() && !force) {
        return new Err(`OVERWRITE_CONFIRM:${backupJsonData.createdBy}`)
    }
    let backupSource, backupTarget = parseOriginLocation(backupJsonData.originLocation)
    switch (info.type) {
        case "flash":
            if (!pEnable.flashIndividual) return new Err("进度恢复失败：当前 Flash 进度管理模块异常，请点击“开始游戏”游玩一会后重试")
            //复制目录
            for (let file of fs.readdirSync(backupRoot)) {
                if (file == "backup.json") continue
                backupSource = path.join(backupRoot, file)

                //检查目标目录是否存在，若不存在则启动一次游戏
                if (!fs.existsSync(path.join(backupTarget, path.basename(backupSource)))) {
                    await shortLaunch(path.join("games", info.type, info.local.folder, info.local.binFile))
                }
                //复制
                if (!fs.existsSync(backupTarget)) shelljs.mkdir("-p", backupTarget)
                if (!copyFolder(backupSource, backupTarget)) {
                    return new Err(`进度恢复失败：无法拷贝进度文件夹${file}`)
                }
            }
            return new Ok(null)
        case "unity":
            // if (!pEnable.unity) return new Err("进度恢复失败：当前 Unity 进度管理模块异常，请点击“开始游戏”游玩一会后重试")
            //复制文件
            for (let file of fs.readdirSync(backupRoot)) {
                if (file == "backup.json") continue
                backupSource = path.join(backupRoot, file)
                if (!fs.existsSync(backupTarget)) shelljs.mkdir("-p", backupTarget)
                if (!copyFile(backupSource, backupTarget)) {
                    return new Err(`进度恢复失败：无法拷贝进度文件${file}`)
                }
            }
            return new Ok(null)
        case "h5":
            const localStorageFile = path.join(backupRoot, "localStorage.json")
            if (!fs.existsSync(localStorageFile)) {
                return new Err("进度恢复失败：当前没有 localStorage 备份")
            }
            let data = JSON.parse(fs.readFileSync(localStorageFile).toString())
            return new Promise(async res => {
                const win = new BrowserWindow({
                    width: 30,
                    height: 20
                })
                win.hide()
                win.webContents.once('did-stop-loading', async () => {
                    //写入localStorage
                    for (let key in data) {
                        await win.webContents.executeJavaScript(`window.localStorage.setItem('${key}', '${data[key]}');`, true)
                    }
                    win.close()
                    res(new Ok(null))
                })
                await win.loadURL(info.online.binUrl, {
                    httpReferrer: info.online.truePage,
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
                })
            })
    }
    return new Err("Error:Fatal,unknown game type : " + info.type)
}

function getBackupTime(info: GameInfo): Option<string> {
    if (info.local == null) return None

    const backupRoot = path.join(process.cwd(), "games", info.type, info.local.folder, "_FC_PROGRESS_BACKUP_")
    if (!fs.existsSync(backupRoot)) return None
    let date = new Date(fs.statSync(backupRoot).mtime)

    return new Some(date.toLocaleString())
}

export {
    initProgressModule,
    backup,
    restore,
    getBackupTime,
    validBackupJson
}
