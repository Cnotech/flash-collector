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
import {getTimeStamp} from "./utils";

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
    //??????????????????swf????????????????????????
    showFlashAlert: (folder: string, swfName: string): boolean => {
        let list = fs.readdirSync(path.join("games", "flash", folder))
        if (list.length > 3) {
            return false
        } else {
            //?????????????????????????????????3
            let existIcon = false
            for (let name of list) {
                if (name.indexOf("icon") > -1) {
                    existIcon = true
                    break
                }
            }
            if (!existIcon && list.length == 3) return false
            else {
                //??????swf????????????
                let status = fs.statSync(path.join("games", "flash", folder, swfName))
                return status.size < 51200;
            }
        }
    },
    del: manager.del,
    initImportPackage: async (): Promise<Result<{ info: GameInfo, overwriteAlert: boolean, progressAlert?: boolean }[], string>> => {
        //?????????????????????
        let r = await dialog.showOpenDialog({
            title: "???????????? Flash Collector Games ?????????",
            filters: [
                {
                    name: "Flash Collector Games ?????????",
                    extensions: ['fcg.7z']
                },
                {
                    name: "?????????",
                    extensions: ['7z', 'zip', 'rar']
                },
            ]
        })
        if (r.canceled) return new Err("Error:User didn't select a package")

        //????????????
        let res = await release(r.filePaths[0], "TEMP/UNZIP-TEMP", true)
        if (!res) return new Err("Error:Can't unzip package")

        //????????????
        const types = ['flash', 'h5', 'unity']
        let valid = false
        for (let type of types) {
            if (fs.existsSync(path.join("TEMP/UNZIP-TEMP", type))) {
                valid = true
                break
            }
        }
        if (!valid) return new Err("Error:Invalid package")

        //info???????????????
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
                    //json schema ??????
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

        //????????????
        let list = manager.readList("TEMP/UNZIP-TEMP")

        //???????????????????????????
        let gameList: { info: GameInfo, overwriteAlert: boolean, progressAlert?: boolean }[] = [], backupFolder,
            backupJson: string, progressAlert: boolean
        for (let type in list) {
            for (let info of list[type]) {
                //??????????????????????????????
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
            //????????????
            let source, target, progressRestoreError: { info: GameInfo, errMsg: string }[] = []
            for (let game of games) {
                if (game.local == null) return new Err(`Error:Fatal error : ${game.title} don't include local key`)
                source = path.join("TEMP/UNZIP-TEMP", game.type, game.local.folder)
                target = path.join("games", game.type, game.local.folder)
                //?????????????????????
                if (fs.existsSync(target)) {
                    shelljs.rm("-rf", target)
                }
                //??????
                shelljs.mkdir("-p", path.join("games", game.type))
                shelljs.cp('-R', source, target)
                //??????
                if (!fs.existsSync(target)) {
                    return new Err(`Error:Import failed : ${game.type}/${game.local.folder}`)
                }
                //??????????????????
                if (includeProgress && fs.existsSync(path.join(target, "_FC_PROGRESS_BACKUP_/backup.json"))) {
                    let r = await restore(game, true)
                    if (r.err) {
                        progressRestoreError.push({
                            info: game,
                            errMsg: r.val
                        })
                    } else {
                        //????????????????????????????????????
                        shelljs.rm("-rf", path.join(target, "_FC_PROGRESS_BACKUP_"))
                    }
                } else if (fs.existsSync(path.join(target, "_FC_PROGRESS_BACKUP_"))) {
                    //???????????????????????????
                    shelljs.rm("-rf", path.join(target, "_FC_PROGRESS_BACKUP_"))
                }
            }
            //????????????
            let report = `????????????${games.length}?????????`
            if (progressRestoreError.length > 0) {
                report += `????????????${progressRestoreError.length}?????????????????????????????????`
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
                report += "????????????????????????????????? Flash Collector ????????????????????????????????? Flash ????????????????????????????????????????????????"
            }
            return new Ok(report)
        } else {
            //????????????
            //??????????????????
            if (fs.existsSync("TEMP/ZIP-TEMP")) {
                shelljs.rm("-rf", "TEMP/ZIP-TEMP")
            }
            shelljs.mkdir("-p", "TEMP/ZIP-TEMP")
            //?????????????????????
            const d = new Date()
            let dRes = await dialog.showSaveDialog({
                title: "?????? Flash Collector Games ?????????",
                defaultPath: (advisedFileName ? advisedFileName + "-" : "") + getTimeStamp(),
                filters: [
                    {
                        name: "Flash Collector Games ?????????",
                        extensions: ['fcg.7z']
                    }
                ]
            })
            if(dRes.canceled||dRes.filePath==null){
                return new Err("Error:User didn't select a location")
            }
            //????????????
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
                        //???????????????????????????????????????????????????
                        shelljs.rm("-rf", backupFolder)
                    } else {
                        //?????????????????????????????????
                        await backup(game)
                    }
                }
            }
            //??????
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
    //??????????????????
    const callMap = new Map<string, (...args: any) => any>()
    for (let key in registry) {
        callMap.set(key, registry[key])
    }

    //???????????????
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
