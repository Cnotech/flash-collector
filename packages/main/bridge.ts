import {ipcMain} from "electron";
import {Reply, Request} from "../class";
import manager from "./manager";

const registry: { [name: string]: (...args: any) => any } = {
    launch: async (payload: { type: string, folder: string, backup: boolean }) => {
        await manager.launch(payload.type, payload.folder, payload.backup)
        return payload
    },
    query: async (payload: { type: string, folder: string }) => {
        return manager.query(payload.type, payload.folder)
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
