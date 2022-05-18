import {Err, Ok, Result} from "ts-results";
import axios from 'axios';
import {GameInfo} from "../../class";
import {BrowserWindow} from "electron";
import cheerio from "cheerio";

let cookie: string | null = null
let updateCookie: (cookie: string) => void

function get7k7kTime(): string {
    const myDateDays = new Date();
    const myDateYearOne = myDateDays.getFullYear().toString();
    const myDateMonthOne = myDateDays.getMonth().toString();
    const myDateDayOne = myDateDays.getDate().toString();
    const myDateHoursOne = myDateDays.getHours().toString();
    const myDateMinutesOne = myDateDays.getMinutes().toString();
    return myDateYearOne + myDateMonthOne + myDateDayOne + myDateHoursOne + myDateMinutesOne;
}

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

        //清空预留cookie
        let old = await win.webContents.session.cookies.get({url: 'http://www.7k7k.com'})
        for (let oldItem of old) {
            await win.webContents.session.cookies.remove('http://www.7k7k.com', oldItem.name)
        }

        //加载页面
        await win.loadURL('http://www.7k7k.com')

        //修改标题
        let init = true
        win.webContents.on('did-stop-loading', async () => {
            if (init) {
                init = false
                win.setTitle("请登录7k7k以继续")
                //点击登录
                await win.webContents.executeJavaScript("document.querySelector('#header > div.header_top > div > div.header_top_r > div.login_no > div.h_login.login_btn > span').click()")
                //清空临时cookie
                let old = await win.webContents.session.cookies.get({url: 'http://www.7k7k.com'})
                for (let oldItem of old) {
                    await win.webContents.session.cookies.remove('http://www.7k7k.com', oldItem.name)
                }
            } else {
                let cookie = await win.webContents.session.cookies.get({url: 'http://www.7k7k.com'})
                if (cookie.length >= 3) {
                    win.close()
                }
            }
        })

        //监听窗口关闭
        win.on('close', async () => {
            win.webContents.session.cookies.get({url: 'http://www.7k7k.com'})
                .then(cookies => {
                    if (cookies.length < 3) {
                        resolve(new Err("Error:Can't read cookie"))
                    } else {
                        cookie = ""
                        cookies.forEach(item => {
                            cookie += `${item.name}=${item.value}; `
                        })
                        updateCookie(cookie)
                        resolve(new Ok(cookie))
                    }
                }).catch(e => {
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
            cookie
        }
        headers['user-agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
        const axiosConfig = {headers}

        //匹配出游戏id
        let p = parseID(url)
        if (p.err) {
            resolve(p)
            return
        }
        const id = p.val

        //获取标题和分类
        let originPage = await axios.get(`http://www.7k7k.com/flash/${id}.htm`, axiosConfig)
        let m = (originPage.data as string).match(/<title>.+<\/title>/)
        if (m == null) {
            resolve(new Err("Error:Can't fetch game title"))
            return
        }
        let s = m[0].replace(/<\/?title>/g, "").split(/\s*-\s*/)
        const title = s[0].split(',')[0], category = s[1].replace("小游戏", "")

        //匹配图标
        const $ = cheerio.load(originPage.data)
        let icon = $('#theme-blue > div.main > div.columns > div.columns_l.con_box > div.wrap.wrap_info > div.game_info > div.game_info_l.game_info_l70 > a > img').prop('src')
        console.log("Get icon : " + icon)

        //发送API请求
        const queryUrl = `http://www.7k7k.com/swf/game/${id}/?time=${get7k7kTime()}`
        let res = await axios.get(queryUrl, {
            headers
        })
        console.log(res.data)
        let json = res.data
        if (json?.result?.url == '') {
            resolve(new Err("Error:Request 7k7k api failed, have you logged in?"))
            return
        }
        const trueUrl = json.result.url as string, gameType = json.result.gameType

        let binUrl
        if (trueUrl.endsWith("swf")) {
            //处理直接返回swf的情况
            binUrl = trueUrl
        } else {
            //请求真实页面
            let truePage = await axios.get(trueUrl, axiosConfig)

            //匹配其中的游戏文件
            m = truePage.data.match(/(https?:\/\/)?[^'"\s]+\.(swf|unity3d)/)
            if (m == null) {
                // return new Err("Error:Can't match any bin file, if this is a HTML5 game thus it's not supported yet")
                console.log("Warning:Can't either try download any swf file or match any bin file, treat as HTML5 game")
                resolve(new Ok({
                    title,
                    category,
                    type: 'h5',
                    fromSite: "7k7k",
                    online: {
                        originPage: `http://www.7k7k.com/flash/${id}.htm`,
                        truePage: trueUrl,
                        binUrl: trueUrl,
                        icon
                    }
                }))
                return
            }
            binUrl = m[0]
            if (binUrl.indexOf("http") == -1) {
                let s = trueUrl.split("/")
                let last = s[s.length - 1]
                binUrl = trueUrl.replace(last, binUrl)
            }

        }
        console.log("Match bin file " + binUrl)

        //确定游戏类型
        let type: "flash" | "unity" | "h5"
        if (binUrl.endsWith("swf")) {
            type = "flash"
        } else if (binUrl.endsWith("unity3d")) {
            type = "unity"
        } else type = "h5"

        //返回结果
        timeout = false
        resolve(new Ok({
            title,
            category,
            type,
            fromSite: "7k7k",
            online: {
                originPage: `http://www.7k7k.com/flash/${id}.htm`,
                truePage: trueUrl,
                binUrl,
                icon
            }
        }))
    })

}

function parseID(url: string): Result<string, string> {
    let m = url.match(/\d+.htm/)
    if (m == null) return new Err("Error:Not a valid 7k7k url")
    else return new Ok(m[0].split(".")[0])
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
    getNickName
}
