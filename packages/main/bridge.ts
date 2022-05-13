import {dialog, ipcMain} from "electron";
import {List, Reply, Request} from "../class";
import manager from "./manager";
import {Err, Ok, Result} from "ts-results";
import {restart, toggleDevtool, version} from "./index";
import {getConfig, setConfig} from "./config";
import path from "path";
import fs from "fs";
import {release} from "./p7zip";
import Ajv from "ajv"
import infoSchema from "./schema/info.json"

const shelljs = require('shelljs')

const ajv = new Ajv()
const infoValidator = ajv.compile(infoSchema)

const registry: { [name: string]: (...args: any) => any } = {
    launch: async (payload: { type: string, folder: string, backup: boolean }): Promise<Result<{ type: string, folder: string, backup: boolean }, string>> => {
        let status = await manager.launch(payload.type, payload.folder, payload.backup)
        if (status) return new Ok(payload)
        else return new Err("Error:Install dependency first")
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
    initImportPackage: async (): Promise<Result<List, string>> => {
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
        let res = await release(r.filePaths[0], "UNZIP-TEMP", true)
        if (!res) return new Err("Error:Can't unzip package")

        //基础校验
        const types = ['flash', 'h5', 'unity']
        let valid = false
        for (let type of types) {
            if (fs.existsSync(path.join("UNZIP-TEMP", type))) {
                valid = true
                break
            }
        }
        if (!valid) return new Err("Error:Invalid package")

        //info可用性校验
        let p: string, result
        for (let type of types) {
            p = path.join("UNZIP-TEMP", type)
            if (!fs.existsSync(p)) {
                continue
            }
            let dir = fs.readdirSync(p)
            for (let folder of dir) {
                p = path.join("UNZIP-TEMP", type, folder, "info.json")
                if (fs.existsSync(p)) {
                    //json schema 校验
                    result = infoValidator(JSON.parse(fs.readFileSync(p).toString()))
                    if (!result) {
                        let errMsg = JSON.stringify(infoValidator.errors, null, 2)
                        infoValidator.errors = null
                        return new Err(`Error:Invalid info.config in ${type}/${folder} :\n${errMsg}`)
                    }
                } else {
                    return new Err(`Error:Can't find info.config in ${type}/${folder}`)
                }
            }
        }

        //读取目录
        return new Ok(manager.readList("UNZIP-TEMP"))
    }
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
