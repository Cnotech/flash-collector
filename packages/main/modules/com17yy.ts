import {Err, Ok, Result} from "ts-results"
import axios, {AxiosRequestConfig, AxiosResponse} from "axios"
import {GameInfo} from "../../class"
import {BrowserWindow} from "electron"
import iconv from "iconv-lite"

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
            url: "http://www.17yy.com",
        })
        for (let oldItem of old) {
            await win.webContents.session.cookies.remove(
                "http://www.17yy.com",
                oldItem.name
            )
        }

        //加载页面
        try {
            await win.loadURL("http://www.17yy.com")
        } catch (e) {
        }

        //修改标题
        let init = true
        win.webContents.on("did-stop-loading", async () => {
            if (init) {
                init = false
                win.setTitle("请登录17yy以继续")
                //点击登录
                await win.webContents.executeJavaScript("alertLoginDiv()")
                //清空临时cookie
                let old = await win.webContents.session.cookies.get({
                    url: "http://www.17yy.com",
                })
                for (let oldItem of old) {
                    await win.webContents.session.cookies.remove(
                        "http://www.17yy.com",
                        oldItem.name
                    )
                }
            } else {
                let cookie = await win.webContents.session.cookies.get({
                    url: "http://www.17yy.com",
                })
                if (cookie.length >= 3) {
                    win.close()
                }
            }
        })

        //监听窗口关闭
        win.on("close", async () => {
            win.webContents.session.cookies
                .get({ url: "http://www.17yy.com" })
                .then((cookies) => {
                    if (cookies.length < 3) {
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
            responseType: "arraybuffer",
        }

        //匹配出游戏id
        let p = parseID(url)
        if (p.err) {
            resolve(p)
            return
        }
        const id = p.val

        /*  view-source:http://www.17yy.com/f/play/245976.html
            <script type="text/javascript"> 
            var server ="img1.17yy.com"; var game_path=""; var classes="swf"; var m7_gameid = "245976";var classId="29";
            var flash_w = 400;var flash_h = 700; var flash_w1 = 400; var flash_h1 = 700; var bi = flash_w /flash_h; 
            var date ="xiuxian"; var m7_gamename = "人生重开模拟器"; var yy_img = "http://pic4.17yy.com/swf/xiuxian/2022-03-20/1ad0bb22f9136f554e5874f40ca8719a.jpg";var sub_li ="|13|79|540|211|";
            var network=0; var tleUrl="http://www.17yy.com/f/245976.html"; </script>
        */
        //获取标题, 分类, 服务器, 类型, 日期, 图标
        let originPage: AxiosResponse
        try {
            originPage = await axios.get(
                `http://www.17yy.com/f/play/${id}.html`,
                axiosConfig
            )
        } catch (e) {
            resolve(new Err(String(e)))
            return
        }
        let originPageHtml = iconv
            .decode(originPage.data, "gb2312")
            .replaceAll(" ", "")

        let matchedTitle = originPageHtml.match(/<title>.+<\/title>/)
        if (matchedTitle == null) {
            resolve(new Err("Error:Can't fetch game title"))
            return
        }
        let matchedCategory = originPageHtml.match(/更多.+小游戏尽在17yy/)
        if (matchedCategory == null) {
            resolve(new Err("Error:Can't fetch game category"))
            return
        }
        let matchedServer = originPageHtml.match(/varserver=".+;vargame_path/i)
        if (matchedServer == null) {
            resolve(new Err("Error:Can't fetch game server"))
            return
        }
        let matchedClasses = originPageHtml.match(/varclasses=".+";varm/i)
        if (matchedClasses == null) {
            resolve(new Err("Error:Can't fetch game classes"))
            return
        }
        let matchedDate = originPageHtml.match(/vardate=".+";varm/i)
        if (matchedDate == null) {
            resolve(new Err("Error:Can't fetch game date"))
            return
        }
        let matchedIcon = originPageHtml.match(/varyy_img=".+";varsub_li/i)
        if (matchedIcon == null) {
            resolve(new Err("Error:Can't fetch game date"))
            return
        }
        const title = matchedTitle[0]
                .replace(/<\/?title>/g, "")
                .replace("在线玩-17yy小游戏", ""),
            category = matchedCategory[0].replace(/[更多小游戏尽在17yy]/g, ""),
            server = matchedServer[0]
                .replace('varserver="', "")
                .replace('";vargame_path', ""),
            classes = matchedClasses[0]
                .replace('varclasses="', "")
                .replace('";varm', ""),
            date = matchedDate[0]
                .replace('vardate="', "")
                .replace('";varm', ""),
            icon = matchedIcon[0]
                .replace('varyy_img="', "")
                .replace('";varsub_li', "")
        console.log("Get icon : ", icon)

        //发送API请求
        const queryUrl = "http://www.17yy.com/e/payapi/vip_ajax.php"
        let apiReqHeaders = headers
        apiReqHeaders["content-type"] = "application/x-www-form-urlencoded"

        let res = await axios.post(queryUrl, `action=getStatus&id=${id}`, {
            responseType: "json",
            headers,
        })
        console.log(res.data)

        const json: {
            code: number
            message: string
            data: {
                isVip: boolean
                isAdult: boolean
                isAlertLogin: boolean
                isAlertDeduct: boolean
                isAlertAdd: boolean
                isAlertMinus: boolean
                isAlertAdultCheck: boolean
                canBargain: boolean
                featnum: number
                deductNum: number
                game_path: string
            }
        } = res.data
        json
        if (json?.data?.game_path == "") {
            resolve(
                new Err("Error:Request 17yy api failed, have you logged in?")
            )
            return
        }
        const game_path = json.data.game_path
        let trueUrl: string = ""
        if (date == "") {
            trueUrl = "http://" + server + "/" + classes
        } else {
            trueUrl =
                "http://" +
                server +
                "/" +
                classes +
                "/" +
                date +
                "/" +
                game_path
        }

        let binUrl = ""
        if (!trueUrl.endsWith("swf") && !trueUrl.endsWith("unity3d")) {
            //处理没有直接返回swf,u3d的情况
            console.log(
                "Warning:Can't either try download any swf file or match any bin file, treat as HTML5 game"
            )
            resolve(
                new Ok({
                    title,
                    category,
                    type: "h5",
                    fromSite: "17yy",
                    online: {
                        originPage: `http://www.17yy.com/f/${id}.html`,
                        truePage: trueUrl,
                        binUrl: trueUrl,
                        icon,
                    },
                })
            )
            return
        } else {
            binUrl = trueUrl
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
        resolve(
            new Ok({
                title,
                category,
                type,
                fromSite: "17yy",
                online: {
                    originPage: `http://www.17yy.com/f/${id}.html`,
                    truePage: trueUrl,
                    binUrl,
                    icon,
                },
            })
        )
    })
}

function parseID(url: string): Result<string, string> {
    let m = url.match(/\d+.html/)
    if (m == null) return new Err("Error:Not a valid 17yy url")
    else return new Ok(m[0].split(".")[0])
}
function getNickName(cookie: string): Result<string, string> {
    let m = cookie.match(/wfyucmlusername=.+;/)
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
