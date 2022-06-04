import {dialog, ipcMain} from "electron";
import {GameInfo, Reply, Request} from "../class";
import manager from "./manager";
import {Err, Ok, Result} from "ts-results";
import {isPackaged, restart, toggleDevtool, version} from "./index";
import {getConfig, setConfig} from "./config";
import path from "path";
import fs from "fs";
import {compress, release} from "./p7zip";
import Ajv from "ajv"
import infoSchema from "./schema/info.json"
import cp from 'child_process'
import {chooseBrowser, getAvailableBrowsers, getBrowserNickName, parseBrowserPath} from "./browser";
import {sniffing} from "./sniffing";
import {update} from "./update";
import {backup, getBackupTime, initProgressModule, restore, validBackupJson} from "./progress";

const shelljs = require('shelljs')

const ajv = new Ajv()
const infoValidator = ajv.compile(infoSchema)

const registry: { [name: string]: (...args: any) => any } = {
    launch: async (type: string, folder: string, method: 'normal' | 'backup' | 'origin'): Promise<Result<{ type: string, folder: string, method: 'normal' | 'backup' | 'origin' }, string>> => {
        let res = await manager.launch(type, folder, method)
        if (res) {
            return new Ok({
                type,
                folder,
                method
            })
        } else {
            return new Err("Error:Install library first")
        }
    },
    query: async (payload: { type: string, folder: string }) => {
        return manager.query(payload.type, payload.folder)
    },
    rename: manager.rename,
    init: manager.init,
    logout: manager.logout,
    login: async (payload: string) => {
        let r = await manager.login(payload)
        let replyPayload: { name: string, status: boolean, errorMessage: string, nickName: string }
        if (r.ok) {
            replyPayload = {
                name: payload,
                status: true,
                errorMessage: "",
                nickName: r.val
            }
        } else {
            replyPayload = {
                name: payload,
                status: false,
                errorMessage: r.val,
                nickName: ""
            }
        }
        return replyPayload
    },
    parse: manager.parser,
    download: manager.downloader,
    refresh: manager.readList,
    install: manager.install,
    devtool: () => {
        toggleDevtool()
    },
    getConfig,
    setConfig,
    restart,
    version,
    localSearch: manager.localSearch,
    //是否需要警告swf可能无法正确播放
    showFlashAlert: (folder: string, swfName: string): boolean => {
        let list = fs.readdirSync(path.join("games", "flash", folder))
        if (list.length > 3) {
            return false
        } else {
            //检查是否无图标且数量为3
            let existIcon = false
            for (let name of list) {
                if (name.indexOf("icon") > -1) {
                    existIcon = true
                    break
                }
            }
            if (!existIcon && list.length == 3) return false
            else {
                //检查swf文件大小
                let status = fs.statSync(path.join("games", "flash", folder, swfName))
                return status.size < 51200;
            }
        }
    },
    del: manager.del,
    initImportPackage: async (): Promise<Result<{ info: GameInfo, overwriteAlert: boolean, progressAlert?: boolean }[], string>> => {
        //打开文件选择框
        let r = await dialog.showOpenDialog({
            title: "选择一个 Flash Collector Games 压缩包",
            filters: [
                {
                    name: "Flash Collector Games 压缩包",
                    extensions: ['fcg.7z']
                },
                {
                    name: "压缩包",
                    extensions: ['7z', 'zip', 'rar']
                },
            ]
        })
        if (r.canceled) return new Err("Error:User didn't select a package")

        //尝试解压
        let res = await release(r.filePaths[0], "TEMP/UNZIP-TEMP", true)
        if (!res) return new Err("Error:Can't unzip package")

        //基础校验
        const types = ['flash', 'h5', 'unity']
        let valid = false
        for (let type of types) {
            if (fs.existsSync(path.join("TEMP/UNZIP-TEMP", type))) {
                valid = true
                break
            }
        }
        if (!valid) return new Err("Error:Invalid package")

        //info可用性校验
        let p: string, result
        for (let type of types) {
            p = path.join("TEMP/UNZIP-TEMP", type)
            if (!fs.existsSync(p)) {
                continue
            }
            let dir = fs.readdirSync(p)
            for (let folder of dir) {
                p = path.join("TEMP/UNZIP-TEMP", type, folder, "info.json")
                if (fs.existsSync(p)) {
                    //json schema 校验
                    result = infoValidator(JSON.parse(fs.readFileSync(p).toString()))
                    if (!result) {
                        let errMsg = infoValidator.errors ? infoValidator.errors[0].message : "Unknown error"
                        infoValidator.errors = null
                        return new Err(`Error:Invalid info.config in ${type}/${folder} :\n${errMsg}`)
                    }
                } else {
                    return new Err(`Error:Can't find info.config in ${type}/${folder}`)
                }
            }
        }

        //读取目录
        let list = manager.readList("TEMP/UNZIP-TEMP")

        //生成列表并校验重复
        let gameList: { info: GameInfo, overwriteAlert: boolean, progressAlert?: boolean }[] = [], backupFolder,
            backupJson: string, progressAlert: boolean
        for (let type in list) {
            for (let info of list[type]) {
                //检查备份信息是否正确
                progressAlert = false
                backupFolder = path.join("TEMP/UNZIP-TEMP", type, info.local?.folder ?? "", "_FC_PROGRESS_BACKUP_")
                backupJson = path.join(backupFolder, "backup.json")
                if (fs.existsSync(backupJson) && validBackupJson(JSON.parse(fs.readFileSync(backupJson).toString())).ok) {
                    progressAlert = true
                } else if (fs.existsSync(backupFolder)) {
                    shelljs.rm("-rf", backupFolder)
                }
                gameList.push({
                    info,
                    overwriteAlert: fs.existsSync(path.join("games", type, info.local?.folder ?? "")),
                    progressAlert
                })
            }
        }
        return new Ok(gameList)
    },
    confirmPort: async (direction: 'Import' | 'Export', games: GameInfo[], includeProgress: boolean, advisedFileName?: string): Promise<Result<string, string>> => {
        if (direction == 'Import') {
            //处理导入
            let source, target, progressRestoreError: { info: GameInfo, errMsg: string }[] = []
            for (let game of games) {
                if (game.local == null) return new Err(`Error:Fatal error : ${game.title} don't include local key`)
                source = path.join("TEMP/UNZIP-TEMP", game.type, game.local.folder)
                target = path.join("games", game.type, game.local.folder)
                //检测重复并删除
                if (fs.existsSync(target)) {
                    shelljs.rm("-rf", target)
                }
                //复制
                shelljs.mkdir("-p", path.join("games", game.type))
                shelljs.cp('-R', source, target)
                //校验
                if (!fs.existsSync(target)) {
                    return new Err(`Error:Import failed : ${game.type}/${game.local.folder}`)
                }
                //导入游戏进度
                if (includeProgress && fs.existsSync(path.join(target, "_FC_PROGRESS_BACKUP_/backup.json"))) {
                    let r = await restore(game, true)
                    if (r.err) {
                        progressRestoreError.push({
                            info: game,
                            errMsg: r.val
                        })
                    } else {
                        //成功恢复后删除本地的备份
                        shelljs.rm("-rf", path.join(target, "_FC_PROGRESS_BACKUP_"))
                    }
                } else if (fs.existsSync(path.join(target, "_FC_PROGRESS_BACKUP_"))) {
                    //删除无效的备份目录
                    shelljs.rm("-rf", path.join(target, "_FC_PROGRESS_BACKUP_"))
                }
            }
            //生成报告
            let report = `成功导入${games.length}个游戏`
            if (progressRestoreError.length > 0) {
                report += `，但是有${progressRestoreError.length}个游戏的进度恢复失败：`
                for (let r of progressRestoreError) {
                    report += ` ${r.info.title}`
                }
            }
            let causedByFlash = false
            for (let item of progressRestoreError) {
                if (item.info.type == "flash") {
                    causedByFlash = true
                    break
                }
            }
            if (causedByFlash) {
                report += "；这可能是由于您尚未从 Flash Collector 启动带有进度保存功能的 Flash 游戏导致的，请稍后在游戏页面重试"
            }
            return new Ok(report)
        } else {
            //处理导出
            //清理临时目录
            if (fs.existsSync("TEMP/ZIP-TEMP")) {
                shelljs.rm("-rf", "TEMP/ZIP-TEMP")
            }
            shelljs.mkdir("-p", "TEMP/ZIP-TEMP")
            //弹出选择对话框
            const d = new Date()
            let dRes = await dialog.showSaveDialog({
                title: "导出 Flash Collector Games 压缩包",
                defaultPath: (advisedFileName ? advisedFileName + "-" : "") + d.getFullYear().toString() + (d.getMonth() + 1) + d.getDate() + "-" + d.getHours() + d.getMinutes() + d.getSeconds(),
                filters: [
                    {
                        name: "Flash Collector Games 压缩包",
                        extensions: ['fcg.7z']
                    }
                ]
            })
            if(dRes.canceled||dRes.filePath==null){
                return new Err("Error:User didn't select a location")
            }
            //复制文件
            let source, target, backupFolder
            for(let game of games) {
                if (game.local == null) return new Err(`Error:Fatal error : ${game.title} don't include local key`)
                source = path.join("games", game.type, game.local.folder)
                target = path.join("TEMP/ZIP-TEMP", game.type, game.local.folder)
                shelljs.mkdir("-p", path.join("TEMP/ZIP-TEMP", game.type))
                shelljs.cp('-R', source, target)

                backupFolder = path.join(target, "_FC_PROGRESS_BACKUP_")
                if (fs.existsSync(backupFolder)) {
                    if (!includeProgress) {
                        //没有包含进度时删除临时目录中的进度
                        shelljs.rm("-rf", backupFolder)
                    } else {
                        //包含进度时尝试保存进度
                        await backup(game)
                    }
                }
            }
            //压缩
            if(!fs.existsSync("exports")) shelljs.mkdir("exports")
            let zipRes = await compress("ZIP-TEMP", dRes.filePath, 5, "TEMP")
            if (!zipRes) {
                return new Err("Error:Can't compress into package")
            }
            return new Ok(dRes.filePath)
        }
    },
    getLoadErrors: manager.getLoadErrors,
    selectInExplorer: (p: string) => {
        try {
            cp.execSync(`explorer /select,"${p}"`)
        } catch (e) {

        }
    },
    getBrowserNickName,
    parseBrowserPath,
    getAvailableBrowsers,
    chooseBrowser,
    sniffing,
    update,
    initProgressModule,
    isPackaged,
    backup,
    restore,
    getBackupTime
}

export default function () {
    //创建调用地图
    const callMap = new Map<string, (...args: any) => any>()
    for (let key in registry) {
        callMap.set(key, registry[key])
    }

    //监听桥事件
    ipcMain.on('bridge', async (event, req: Request) => {
        let entry = callMap.get(req.functionName)
        if (entry == null) {
            console.log(`Error:Function ${req.functionName} unregistered!`)
        } else {
            const payload = await entry(...req.args),
                reply: Reply = {
                    id: req.id,
                    payload
                }
            event.reply('bridge-reply', reply)
        }
    })
}
