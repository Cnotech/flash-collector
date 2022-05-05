import {GameInfo, List} from "../class";
import {ipcMain} from "electron";
import manager from "./manager";
import {Err} from "ts-results";


let gameList: List

export default function () {
//被动接收初始化请求
    ipcMain.on('init', (event) => {
        event.reply('init-reply', manager.init())
    })

//登录与登出
    ipcMain.on('login', async (event, payload: string) => {
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
        event.reply('login-reply', replyPayload)
    })
    ipcMain.on('logout', (e, payload) => {
        manager.logout(payload)
    })

//游戏信息解析
    ipcMain.on('parse', async (event, payload: string) => {
        let reply = false
        setTimeout(() => {
            if (reply) return
            else event.reply('parse-reply', new Err("Error:Fetch timeout"))
        }, 5000)
        let res = await manager.parser(payload)
        reply = true
        event.reply('parse-reply', res)
    })

//下载游戏
    ipcMain.on('download', async (event, payload: GameInfo) => {
        let r = await manager.downloader(payload)
        event.reply('download-reply', r)
    })

//刷新游戏列表
    ipcMain.on('refresh', async (event) => {
        gameList = manager.readList()
        event.reply('refresh-reply', gameList)
    })

//启动游戏
    ipcMain.on('launch', (event, payload: { type: string, folder: string }) => {
        manager.launch(payload.type, payload.folder)
            .then(() => {
                event.reply('launch-reply', payload)
            })
    })

//信息查询
    ipcMain.on('query', (event, payload: { type: string, folder: string }) => {
        event.reply('query-reply', manager.query(payload.type, payload.folder))
    })

}
