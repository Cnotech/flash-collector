import {ipcMain} from "electron";
import {GameInfo, Reply, Request} from "../class";
import manager from "./manager";
import {Err, Ok, Result} from "ts-results";

const registry: { [name: string]: (...args: any) => any } = {
    launch: async (payload: { type: string, folder: string, backup: boolean }): Promise<Result<{ type: string, folder: string, backup: boolean }, string>> => {
        let status = await manager.launch(payload.type, payload.folder, payload.backup)
        if (status) return new Ok(payload)
        else return new Err("Error:Install dependency first")
    },
    query: async (payload: { type: string, folder: string }) => {
        return manager.query(payload.type, payload.folder)
    },
    init: async () => {
        return manager.init()
    },
    logout: (name: string) => {
        manager.logout(name)
    },
    login: async (payload: string) => {
        let r = await manager.login(payload)
        let replyPayload: { name: string, status: boolean, errorMessage: string }
        if (r.ok) {
            replyPayload = {
                name: payload,
                status: true,
                errorMessage: ""
            }
        } else {
            replyPayload = {
                name: payload,
                status: false,
                errorMessage: r.val
            }
        }
        return replyPayload
    },
    parse: async (payload: string): Promise<Result<GameInfo, string>> => {
        return manager.parser(payload)
    },
    download: async (payload: GameInfo) => {
        return manager.downloader(payload)
    },
    refresh: async () => {
        return manager.readList()
    },
    install: (type) => {
        return manager.install(type)
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
