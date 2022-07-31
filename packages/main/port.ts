import {GameInfo} from "../class";
import {Err, Ok, Result} from "ts-results";
import path from "path";
import fs from "fs";
import shelljs from "shelljs";
import {backup, restore, validBackupJson} from "./progress";
import {dialog} from "electron";
import {getTimeStamp} from "./utils";
import {compress, release} from "./p7zip";
import manager from "./manager";
import Ajv from "ajv";
import infoSchema from "./schema/info.json";

const ajv = new Ajv()
const infoValidator = ajv.compile(infoSchema)

async function confirmPort(direction: 'Import' | 'Export', games: GameInfo[], includeProgress: boolean, advisedFileName?: string): Promise<Result<string, string>> {
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
            defaultPath: (advisedFileName ? advisedFileName + "-" : "") + getTimeStamp(),
            filters: [
                {
                    name: "Flash Collector Games 压缩包",
                    extensions: ['fcg.7z']
                }
            ]
        })
        if (dRes.canceled || dRes.filePath == null) {
            return new Err("Error:User didn't select a location")
        }
        //复制文件
        let source, target, backupFolder
        for (let game of games) {
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
        if (!fs.existsSync("exports")) shelljs.mkdir("exports")
        let zipRes = await compress("ZIP-TEMP", dRes.filePath, 5, "TEMP")
        if (!zipRes) {
            return new Err("Error:Can't compress into package")
        }
        return new Ok(dRes.filePath)
    }
}

async function initImportPackage(): Promise<Result<{ info: GameInfo, overwriteAlert: boolean, progressAlert?: boolean }[], string>> {
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
}

export {
    confirmPort,
    initImportPackage
}