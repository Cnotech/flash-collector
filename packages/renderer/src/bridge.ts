import {ipcRenderer} from "electron";
import {Reply, Request} from "../../class";

let taskCount = 0

function getID(): number {
    taskCount++
    return taskCount
}

export default async function (functionName: string, ...args: any): Promise<any> {
    return new Promise((resolve) => {
        //获取任务id
        const id = getID()
        //生成回调函数
        const callback = (_: any, reply: Reply) => {
            if (reply.id != id) return
            else {
                resolve(reply.payload)
                ipcRenderer.removeListener('bridge-reply', callback)
                return
            }
        }
        //监听回调
        ipcRenderer.on('bridge-reply', callback)
        //发送
        const req: Request = {
            id, args, functionName
        }
        ipcRenderer.send('bridge', req)
    })
}
