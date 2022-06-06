import {Err, Ok, Result} from 'ts-results';
import axios from 'axios';
import {GameInfo} from '../../class';
import {BrowserWindow} from 'electron';
import cheerio from 'cheerio';

let cookie: string | null = null
let updateCookie: (cookie: string) => void

function initCookie(c: string | null, updateCookieCallback: (cookie: string) => void) {
    if (c != null) {
        cookie = c
    }
    updateCookie = updateCookieCallback
}

//登录获取cookie
async function getCookie(): Promise<Result<string, string>> {
    return new Promise(async (resolve) => {
        cookie = null
        //新建窗口
        const win = new BrowserWindow({width: 800, height: 600, icon: "./retinue/favicon.ico"})

        //加载下载页
        await win.loadURL('https://www.game773.com/down')

        //直接关闭
        win.webContents.once('did-stop-loading', async () => {
            win.webContents.session.cookies.get({url: 'https://www.game773.com/down'})
                .then(cookies => {
                    win.close()
                    cookie = ""
                    cookies.forEach(item => {
                        cookie += `${item.name}=${item.value}; `
                    })
                    updateCookie(cookie)
                    resolve(new Ok(cookie))
                }).catch(e => {
                console.log(e)
                resolve(new Err("Error:Can't read cookie"))
            })
        })
    })
}

function setCookie(c: string) {
    cookie = c
}

function clearCookie() {
    cookie = null
}

async function entrance(url: string): Promise<Result<GameInfo, string>> {
    return new Promise(async (resolve) => {
        //检查cookie是否为空
        if (cookie == null && (await getCookie()).err) {
            resolve(new Err("Error:Can't get cookie"))
            return
        }

        //配置超时定时器
        let timeout = true
        setTimeout(() => {
            if (timeout) {
                resolve(new Err("Error:Parse timeout"))
                return
            }
        }, 5000)

        //匹配出游戏id
        let p = parseID(url)
        if (p.err) {
            resolve(p)
            return
        }
        const id = p.val

        //请求下载页面
        let page: string = ""
        try {
            let g = await axios.get(`https://www.game773.com/down/${id}.html`)
            page = g.data
        } catch (e) {
            console.log(e)
            resolve(new Err("Error:Can't get download page"))
            return
        }
        if (page == "") {
            resolve(new Err("Error:Get void download page"))
            return
        }

        //挂载下载页面
        const $ = cheerio.load(page)
        let iconElement = $("#goodplace > div > div.info > div > div.pic > a > img")
        const iconURL = iconElement.prop("src"),
            title = iconElement.prop("alt"),
            category = $("#goodplace > div > div.info > dl > dd:nth-child(2)").text().split("：")[1].slice(0, -1),
            binURL = $("#goodplace > div > div.info > dl > dd:nth-child(4) > a").prop("href")

        //根据后缀名判断游戏类型
        if (typeof binURL != "string") {
            resolve(new Err("错误：此游戏不提供下载"))
            return
        }
        let type: GameInfo['type'] = "h5"
        if (binURL.endsWith(".swf")) {
            type = "flash"
        } else if (binURL.endsWith(".unity3d")) {
            type = "unity"
        }

        //生成结果
        let result: GameInfo = {
            title,
            category,
            type,
            fromSite: "game773",
            online: {
                originPage: `https://www.game773.com/play/${id}.html`,
                truePage: binURL,
                binUrl: binURL,
                icon: iconURL
            }
        }
        // console.log(result)
        resolve(new Ok(result))
    })

}

function parseID(url: string): Result<string, string> {
    let m = url.match(/[\d_]+.htm/)
    if (m == null) return new Err("Error:Not a valid 4399 url")
    else return new Ok(m[0].split(/(_\d)?\./)[0])
}

function getNickName(_: string): Result<string, string> {
    return new Ok("Guest")
}

export default {
    name: "game773",
    regex: /https?:\/\/www\.game773\.com\/play\/[\d_]+\.htm/,
    entrance,
    utils: {
        parseID,
        getNickName
    },
    cookieController: {
        init: initCookie,
        set: setCookie,
        get: getCookie,
        clear: clearCookie
    }
}
