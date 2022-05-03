import {Result, Ok, Err} from "ts-results";
import axios from 'axios';
import {GameInfo} from "../../class";
import {BrowserWindow} from "electron";

// let cookie:string|null="isP=false; userWatch=2; username=2612468853; nickname=J3rry; loginfrom=wx; SERVER_ID=f0980091-d9ee5f9f; VUSERID=20220503013741BxY46DCfACi4kepHx2A2EBeJ; Hm_lvt_4f1beaf39805550dd06b5cac412cd19b=1651257273,1651306387,1651392366,1651510165; timekey=bf4a7df2f1da562984d76a1a90d7c401; identity=2612468853; userid=865057103; kk=2612468853; logintime=1651513112; k7_lastlogin=1651513112; avatar=http://sface.7k7kimg.cn/uicons/photo_default_s.png; securitycode=d9046817106fba948ac3313b3fe37e2b; Hm_lpvt_4f1beaf39805550dd06b5cac412cd19b=1651513124"
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
        const win = new BrowserWindow({width: 800, height: 600})
        await win.loadURL('http://www.7k7k.com')

        //修改标题
        win.webContents.once('did-stop-loading', async () => {
            win.setTitle("登录7k7k后关闭窗口")
            let old = await win.webContents.session.cookies.get({url: 'http://www.7k7k.com'})
            for (let oldItem of old) {
                await win.webContents.session.cookies.remove('http://www.7k7k.com', oldItem.name)
            }
        })

        //监听窗口关闭
        win.on('close', async () => {
            win.webContents.session.cookies.get({url: 'http://www.7k7k.com'})
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

async function entrance(url: string): Promise<Result<GameInfo, string>> {
    //检查cookie是否为空
    if (cookie == null && (await getCookie()).err) return new Err("Error:Can't get cookie")
    //构造header
    const headers: any = {
        referer: url,
        cookie
    }
    headers['user-agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
    const axiosConfig = {headers}

    //匹配出游戏id
    let m = url.match(/\d+.htm/)
    if (m == null) return new Err("Error:Can't parse game id")
    const id = m[0].split(".")[0]

    //获取标题
    let originPage = await axios.get(`http://www.7k7k.com/flash/${id}.htm`, axiosConfig)
    m = (originPage.data as string).match(/<title>.+<\/title>/)
    if (m == null) return new Err("Error:Can't fetch game title")
    let s = m[0].replace(/<\/?title>/g, "").split(/\s*-\s*/)
    const title = s[0].split(',')[0], category = s[1].replace("小游戏", "")

    //发送API请求
    const queryUrl = `http://www.7k7k.com/swf/game/${id}/?time=${get7k7kTime()}`
    let res = await axios.get(queryUrl, {
        headers
    })
    console.log(res.data)
    let json = res.data
    if (json?.result?.url == '') {
        return new Err("Error:Request 7k7k api failed, have you logged in?")
    }
    const trueUrl = json.result.url as string, gameType = json.result.gameType

    //请求真实页面
    let truePage = await axios.get(trueUrl, axiosConfig)

    //匹配其中的游戏文件
    m = truePage.data.match(/(https?:\/\/)?[^'"\s]+.(swf|unity3d)/)
    if (m == null) return new Err("Error:Can't match any bin file, if this is a HTML5 game thus it's not supported yet")
    let binUrl = m[0]
    if (binUrl.indexOf("http") == -1) {
        let s = trueUrl.split("/")
        let last = s[s.length - 1]
        binUrl = trueUrl.replace(last, binUrl)
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
        fromSite: "7k7k",
        online: {
            originPage: url,
            truePage: trueUrl,
            binUrl
        }
    })
}

export default {
    initCookie,
    entrance,
    getCookie,
    setCookie,
    clearCookie
}