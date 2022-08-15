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
                }).catch(_ => {
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

//匹配无法解析ID的不规范url
async function common7k7kParser(html: string): Promise<Result<string, string>> {
    const $ = cheerio.load(html)
    const iframes = $("iframe")
    if (iframes.length == 0) {
        return new Err("Error:No game iframe found on this page")
    }
    let src = iframes.attr("src")
    if (src?.startsWith("//")) {
        src = "http:" + src
    }
    console.log(`Info:Get iframe src = ${src}`)
    if (src != null && src.includes("7k7k.com")) {
        return new Ok(src)
    } else {
        //对于可能使用动态真实页面的页面匹配关键词
        const dynamicTrueUrlRegex = /_gamespecialpath\s*=\s*"(.+)"/
        let match = html.match(dynamicTrueUrlRegex)
        if (match != null) {
            return new Ok(match[0].replace(dynamicTrueUrlRegex, "$1"))
        } else {
            return new Err("Error:No valid game iframe found on this page")
        }
    }
}

function getTitleAndCategory(html: string): Result<{ title: string, category: string }, string> {
    const originTitleMatchers: Array<(url: string) => string | null> = [
        (url) => {
            let m = html.match(/<title>.+<\/title>/i)
            if (m == null) return null
            return m[0].replace(/<\/?title>/g, "")
        },
        (url) => {
            const regex = /<meta property="og:title" content="(.+)" \/>/i
            let m = html.match(regex)
            if (m == null) return null
            return m[0].replace(regex, "$1")
        }
    ]
    //使用匹配链尝试匹配标题
    let originTitle: string | null = null
    for (let matcher of originTitleMatchers) {
        const res = matcher(html)
        if (res != null) {
            originTitle = res
            break
        }
    }

    if (originTitle == null) {
        return new Err("Error:Can't parse game title")
    }
    //尝试使用 - 分割标题以判断是否为标准页面
    let s = originTitle.split(/\s*-\s*/)
    if (s.length > 2) {
        //标准标题
        const title = s[0].split(',')[0], category = s[1].replace("小游戏", "")
        return new Ok({
            title,
            category
        })
    } else {
        //非标准标题，使用_分割后直接返回
        let title = originTitle.split(/[_,]/)[0]
        return new Ok({
            title,
            category: "专题"
        })
    }
}

async function entrance(url: string): Promise<Result<GameInfo, string>> {
    console.log(url)
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
            console.log("Info:Can't parse id, try common match")
            //尝试使用通用匹配方法

            //直接获取用户输入页面
            const htmlRes = await axios.get(url)

            //获取标题和分类
            let tcRes = getTitleAndCategory(htmlRes.data)
            if (tcRes.err) {
                resolve(tcRes)
                return
            }
            const {title, category} = tcRes.val

            //尝试通用匹配真实页面
            const commonMatch = await common7k7kParser(htmlRes.data)
            if (commonMatch.ok) {
                resolve(await getGameInfoFromTrueUrl(commonMatch.val, {
                    axiosConfig,
                    title,
                    category,
                    originUrl: url
                }))
            } else {
                resolve(commonMatch)
            }
            return
        }
        const id = p.val

        //获取页面
        let originPage = await axios.get(`http://www.7k7k.com/flash/${id}.htm`, axiosConfig)

        //获取标题和分类
        let tcRes = getTitleAndCategory(originPage.data)
        console.log(tcRes)
        if (tcRes.err) {
            resolve(tcRes)
            return
        }
        const {title, category} = tcRes.val

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
        const trueUrl = json.result.url as string
        // const gameType = json.result.gameType
        const result = await getGameInfoFromTrueUrl(trueUrl, {
            axiosConfig,
            title,
            category,
            id,
            icon,
            originUrl: url
        })

        timeout=false
        resolve(result)
    })

}

async function getGameInfoFromTrueUrl(trueUrl: string, props: {
    axiosConfig: any,
    title: string,
    category: string,
    originUrl: string,
    id?: string,
    icon?: string
}): Promise<Result<GameInfo, string>> {
    const {axiosConfig, title, category, id, icon} = props
    const originPage = id != null ? `http://www.7k7k.com/flash/${id}.htm` : props.originUrl
    return new Promise(async (resolve) => {
        let binUrl
        if (trueUrl.endsWith("swf")) {
            //处理直接返回swf的情况
            binUrl = trueUrl
        } else {
            //请求真实页面
            let truePage = await axios.get(trueUrl, axiosConfig)

            //匹配其中的游戏文件
            let m = truePage.data.match(/(https?:\/\/)?[^'"\s]+\.(swf|unity3d)/)
            if (m == null) {
                if (id != null) {
                    console.log("Warning:Can't either try download any swf file or match any bin file, treat as HTML5 game")
                    resolve(new Ok({
                        title,
                        category,
                        type: 'h5',
                        fromSite: "7k7k",
                        online: {
                            originPage,
                            truePage: trueUrl,
                            binUrl: trueUrl,
                            icon
                        }
                    }))
                } else {
                    resolve(new Err("Error:Can't find game on this page"))
                }
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
        resolve(new Ok({
            title,
            category,
            type,
            fromSite: "7k7k",
            online: {
                originPage,
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
