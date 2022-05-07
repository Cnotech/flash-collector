import {Result, Ok, Err} from "ts-results";
import axios, {AxiosRequestConfig} from 'axios';
import {GameInfo} from "../../class";
import {BrowserWindow} from "electron";

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
        const win = new BrowserWindow({width: 800, height: 600})
        await win.loadURL('https://www.4399.com')

        //修改标题
        win.webContents.once('did-stop-loading', async () => {
            win.setTitle("登录4399后关闭窗口")
            let old = await win.webContents.session.cookies.get({url: 'https://www.4399.com'})
            for (let oldItem of old) {
                await win.webContents.session.cookies.remove('https://www.4399.com', oldItem.name)
            }
        })

        //监听窗口关闭
        win.on('close', async () => {
            win.webContents.session.cookies.get({url: 'https://www.4399.com'})
                .then(cookies => {
                    console.log(cookies)
                    if (cookies.length < 2) {
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

function getAxiosConfig(referer: string): AxiosRequestConfig {
    //构造header
    const headers: any = {
        referer,
        cookie
    }
    headers['user-agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
    return {headers}
}

async function entrance(url: string): Promise<Result<GameInfo, string>> {
    //检查cookie是否为空
    if (cookie == null && (await getCookie()).err) return new Err("Error:Can't get cookie")

    //匹配出游戏id
    let p = parseID(url)
    if (p.err) return p
    const id = p.val

    //获取标题
    let originPage = await axios.get(`https://www.4399.com/flash/${id}.htm`, getAxiosConfig("https://www.4399.com"))
    let m = (originPage.data as string).match(/<title>.+<\/title>/)
    if (m == null) return new Err("Error:Can't fetch game title")
    const title = m[0].replace(/<\/?title>/g, "").split(",")[0]
    console.log(title)

    //获取分类
    m = (originPage.data as string).match(/分类：.+小游戏/)
    if (m == null) return new Err("Error:Can't get game category")
    const category = m[0].slice(-5, -3)
    console.log(category)

    //获取游戏页面链接
    m = (originPage.data as string).match(new RegExp(`/flash/${id}_\\d.htm`))
    if (m == null) return new Err("Error:Can't parse playing page")
    const playingPage = m[0]
    console.log(playingPage)

    //获取游戏页面
    originPage = await axios.get(`https://www.4399.com${playingPage}`, getAxiosConfig(`https://www.4399.com/flash/${id}.htm`))

    //匹配服务器源
    let page = originPage.data as string
    m = page.match(/src="\/js\/server.+\.js"/)
    if (m == null) return new Err("Error:Can't match server js file")
    //请求服务器源js文件
    let serverJS = await axios.get(`https://www.4399.com${m[0]}`, getAxiosConfig(`https://www.4399.com${playingPage}`))
    //匹配其中的 webServer
    m = (serverJS.data as string).match(/webServer\s*=\s*".+"/)
    if (m == null) return new Err("Error:Can't match webServer")
    let webServer = m[0].split('"')[1]
    if (webServer.slice(0, 2) == "//") webServer = "https:" + webServer
    console.log(webServer)

    //匹配真实页面路径
    m = page.match(/_strGamePath\s*=\s*".*"/)
    if (m == null) return new Err("Error:Can't match true game page")
    const trueUrl = webServer + m[0].split('"')[1]
    console.log(trueUrl)

    //匹配二进制文件
    let binUrl
    if (trueUrl.endsWith("swf")) {
        //处理直接返回swf的情况
        binUrl = trueUrl
    } else {
        //请求真实页面
        let truePage = await axios.get(trueUrl, getAxiosConfig(`https://www.4399.com${playingPage}`))

        //匹配其中的游戏文件
        m = truePage.data.match(/(https?:\/\/)?[^'"\s]+.(swf|unity3d)/)
        if (m == null) return new Err("Error:Can't match any bin file, if this is a HTML5 game thus it's not supported yet")
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


    return new Ok({
        title,
        category,
        type,
        fromSite: "4399",
        online: {
            originPage: `https://www.4399.com/flash/${id}.htm`,
            truePage: trueUrl,
            binUrl
        }
    })
}

function parseID(url: string): Result<string, string> {
    let m = url.match(/[\d_]+.htm/)
    if (m == null) return new Err("Error:Not a valid 4399 url")
    else return new Ok(m[0].split(/(_\d)?\./)[0])
}

export default {
    entrance,
    parseID,
    initCookie,
    getCookie,
    setCookie,
    clearCookie
}
