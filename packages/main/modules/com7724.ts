import {Err, Ok, Result} from "ts-results"
import axios, {AxiosRequestConfig, AxiosResponse} from "axios"
import {GameInfo} from "../../class"
import {BrowserWindow} from "electron"
import cheerio from "cheerio"

let cookie: string | null = null
let updateCookie: (cookie: string) => void

function initCookie(
    c: string | null,
    updateCookieCallback: (cookie: string) => void
) {
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
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            icon: "./retinue/favicon.ico",
        })

        //清空预留cookie
        let old = await win.webContents.session.cookies.get({
            url: "http://www.7724.com",
        })
        for (let oldItem of old) {
            await win.webContents.session.cookies.remove(
                "http://www.7724.com",
                oldItem.name
            )
        }

        //加载页面
        await win.loadURL("http://www.7724.com")

        //修改标题
        let init = true
        win.webContents.on("did-stop-loading", async () => {
            if (init) {
                init = false
                win.setTitle("请登录7724以继续")
                //点击登录
                await win.webContents.executeJavaScript(
                    '$(".login_box,.box_opacity").show();'
                )
                //清空临时cookie
                let old = await win.webContents.session.cookies.get({
                    url: "http://www.7724.com",
                })
                for (let oldItem of old) {
                    await win.webContents.session.cookies.remove(
                        "http://www.7724.com",
                        oldItem.name
                    )
                }
            } else {
                let cookie = await win.webContents.session.cookies.get({
                    url: "http://www.7724.com",
                })
                if (cookie.length > 12) {
                    win.close()
                }
            }
        })

        //监听窗口关闭
        win.on("close", async () => {
            win.webContents.session.cookies
                .get({url: "http://www.7724.com"})
                .then((cookies) => {
                    if (cookies.length <= 12) {
                        resolve(new Err("Error:Can't read cookie"))
                    } else {
                        cookie = ""
                        cookies.forEach((item) => {
                            cookie += `${item.name}=${item.value}; `
                        })
                        updateCookie(cookie)
                        resolve(new Ok(cookie))
                    }
                })
                .catch((e) => {
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
            if (timeout) resolve(new Err("Error:Parse timeout"))
        }, 5000)

        //构造header
        const headers: any = {
            referer: url,
            cookie,
        }
        headers["user-agent"] =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
        const axiosConfig: AxiosRequestConfig = {
            headers,
            responseType: "text",
        }

        //匹配出游戏名
        let p = parseID(url)
        if (p.err) {
            resolve(p)
            return
        }
        const gameName = p.val

        //获取标题, 分类, 服务器, 类型, 日期, 图标
        let originPage: AxiosResponse, infoPage: AxiosResponse
        try {
            originPage = await axios.get(
                `http://www.7724.com/${gameName}/game`,
                axiosConfig
            )
            infoPage = await axios.get(
                `http://www.7724.com/${gameName}`,
                axiosConfig
            )
        } catch (e) {
            resolve(new Err(String(e)))
            return
        }
        const originPageHtml = String(originPage.data),
            infoPageHtml = String(infoPage.data)
        if (!originPageHtml || !infoPageHtml) {
            resolve(
                new Err("Error:Request 7724 page failed, have you logged in?")
            )
            return
        }
        let $ = cheerio.load(originPageHtml),
            $2 = cheerio.load(infoPageHtml)

        let title = $("title").html(),
            icon = $2(
                "body > div.general > div.h5_left > div.news_detail > div.n_d_top > div.n_d_t_left > a > img"
            ).attr("src"),
            category = $2(
                "body > div.general > div.h5_left > div.news_detail > div:nth-child(11) > a"
            ).html()
        console.log("Get icon : ", icon)

        if (!title) {
            resolve(new Err("Error:Can't fetch game title"))
            return
        }
        title = title.split("-")[0]
        if (!icon) {
            resolve(new Err("Error:Can't fetch game icon"))
            return
        }
        if (!category) {
            resolve(new Err("Error:Can't fetch game category"))
            return
        }

        //匹配游戏地址
        let trueUrl = $("#game_if").attr("src")
        if (!trueUrl) {
            resolve(new Err("Error:Can't fetch game true url"))
            return
        }
        trueUrl = trueUrl.split("url=")[1]
        if (
            !trueUrl.startsWith("http://") &&
            !trueUrl.startsWith("https://") &&
            !trueUrl.startsWith("//")
        ) {
            resolve(new Err("Error:Can't match game true url"))
            return
        }
        console.log(trueUrl)

        //返回结果
        resolve(
            new Ok({
                title,
                category,
                type: "h5",
                fromSite: "7724",
                online: {
                    originPage: `http://www.7724.com/${gameName}/`,
                    truePage: trueUrl,
                    binUrl: trueUrl,
                    icon,
                },
            })
        )
    })
}

function parseID(url: string): Result<string, string> {
    // https://www.7724.com/JieXianMiTi2/
    return new Ok(url.split("/")[3])
}

function getNickName(cookie: string): Result<string, string> {
    let m = cookie.match(/nickname=.+;/)
    if (m == null) return new Err("Error:Can't match nick name")
    return new Ok(decodeURI(m[0].split(/[=;]/)[1].replace(/\+/g, "%20")))
}

export default {
    entrance,
    parseID,
    initCookie,
    getCookie,
    setCookie,
    clearCookie,
    getNickName,
}
