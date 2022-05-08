import {ipcMain} from "electron";
import {GameInfo, Reply, Request} from "../class";
import manager from "./manager";
import {Err, Result} from "ts-results";

const registry: { [name: string]: (...args: any) => any } = {
    launch: async (payload: { type: string, folder: string, backup: boolean }) => {
        await manager.launch(payload.type, payload.folder, payload.backup)
        return payload
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
