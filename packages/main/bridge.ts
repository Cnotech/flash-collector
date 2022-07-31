import {ipcMain} from "electron";
import {Reply, Request} from "../class";
import manager from "./manager";
import {Err, Ok, Result} from "ts-results";
import {isPackaged, restart, toggleDevtool, version} from "./index";
import {getConfig, setConfig} from "./config";
import path from "path";
import fs from "fs";
import cp from 'child_process'
import {chooseBrowser, getAvailableBrowsers, getBrowserNickName, parseBrowserPath} from "./browser";
import {sniffing} from "./sniffing";
import {update} from "./update";
import {backup, getBackupTime, initProgressModule, restore} from "./progress";
import {confirmPort, initImportPackage} from "./port";


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
    initImportPackage,
    confirmPort,
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
