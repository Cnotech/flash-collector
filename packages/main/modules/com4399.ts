import {Err, Ok, Result} from 'ts-results';
import axios, {AxiosRequestConfig} from 'axios';
import {GameInfo} from '../../class';
import {BrowserWindow} from 'electron';
import iconv from 'iconv-lite';
import cheerio from 'cheerio';
import {GBKDecodeUri, GBKEncodeUri} from "./GBKUri";

let cookie: string | null = null
let updateCookie: (cookie: string) => void

interface SearchResult {
    icon: string,
    id: string
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
        let old = await win.webContents.session.cookies.get({url: 'http://www.4399.com'})
        for (let oldItem of old) {
            await win.webContents.session.cookies.remove('http://www.4399.com', oldItem.name)
        }

        //加载页面
        await win.loadURL('http://www.4399.com')

        //修改标题
        win.webContents.once('did-stop-loading', async () => {
            win.setTitle("请登录4399以继续")
            //点击登录
            await win.webContents.executeJavaScript("document.getElementById('login_tologin').click()")
            //清空临时cookie
            let old = await win.webContents.session.cookies.get({url: 'http://www.4399.com'})
            for (let oldItem of old) {
                await win.webContents.session.cookies.remove('http://www.4399.com', oldItem.name)
            }
            //新增登录成功监听器
            let cookie
            let i = setInterval(async () => {
                cookie = await win.webContents.session.cookies.get({url: 'http://www.4399.com'})
                if (cookie.length >= 5) {
                    win.close()
                    clearInterval(i)
                }
            }, 1000)
        })

        //监听窗口关闭
        win.on('close', async () => {
            win.webContents.session.cookies.get({url: 'http://www.4399.com'})
                .then(cookies => {
                    if (cookies.length < 5) {
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

function getAxiosConfig(referer: string): AxiosRequestConfig {
    //构造header
    const headers: any = {
        referer,
        cookie
    }
    headers['user-agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
    return {
        headers,
        responseType: "arraybuffer"
    }
}

async function fetch(url: string, referer: string): Promise<string> {
    let b = await axios.get(url, getAxiosConfig(referer))
    let str = iconv.decode(Buffer.from(b.data), 'GB2312')
    return iconv.encode(str, 'UTF8').toString()
}

const fullUrl=(raw:string)=>{
    if(raw.startsWith('//')){
        return `https:${raw}`
    }else if (raw.startsWith('/')){
        return `https://www.4399.com${raw}`
    }
    return undefined
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

        //获取标题
        let originPage = await fetch(`http://www.4399.com/flash/${id}.htm`, "http://www.4399.com")
        // fs.writeFileSync("page.html", originPage)
        let m = originPage.match(/<title>.+<\/title>/i)
        if (m == null) {
            resolve(new Err("Error:Can't fetch game title"))
            return
        }
        const title = m[0].replace(/<\/?title>/ig, "").split(/[,_]/)[0]
        // console.log('title:'+title)

        //获取分类
        m = (originPage as string).match(/分类[：:].+小游戏/)
        if (m == null) {
            resolve(new Err("Error:Can't get game category"))
            return
        }
        m = m[0].match(/[^>]+小游戏/)
        if (m == null) {
            resolve(new Err("Error:Can't parse game category"))
            return
        }
        const category = m[0].slice(0, -3)
        // console.log('cate:'+category)

        //获取游戏页面链接
        m = (originPage as string).match(new RegExp(`/flash/${id}_\\d.htm`))
        if (m == null) {
            //加入pvz补丁
            let pvzPatchRes = await pvzPatch(originPage, {title, category, id})
            if (pvzPatchRes.ok) {
                resolve(pvzPatchRes)
                return
            }
            // 也有可能当前页就是真实页面
            if (originPage.match(/_strGamePath\s*=\s*".*"/)?.length) {
                m = [`/flash/${id}.htm`]
            } else {
                resolve(new Err("Error:Can't parse playing page"))
                return
            }
        }
        const playingPage = m[0]
        // console.log('playingPage:'+playingPage)

        //获取游戏页面
        let page = await fetch(`http://www.4399.com${playingPage}`, `http://www.4399.com/flash/${id}.htm`)

        //匹配服务器源
        m = page.match(/src="\/js\/\S+\.js"/)
        if (m == null) {
            resolve(new Err("Error:Can't match server js file"))
            return
        }
        //请求服务器源js文件
        let serverJS = await fetch(`http://www.4399.com${m[0].split('"')[1]}`, `http://www.4399.com${playingPage}`)
        //匹配其中的 webServer
        m = serverJS.match(/webServer\s*=\s*".+"/)
        if (m == null) {
            resolve(new Err("Error:Can't match webServer"))
            return
        }
        let webServer = m[0].split('"')[1]
        if (webServer.slice(0, 2) == "//") webServer = "http:" + webServer
        // console.log('webServer',webServer)

        //匹配真实页面路径
        m = page.match(/_strGamePath\s*=\s*".*"/)
        if (m == null) {
            resolve(new Err("Error:Can't match true game page"))
            return
        }
        let strGamePath = m[0].split('"')[1]
        if (strGamePath.startsWith('//')) strGamePath = 'http:' + strGamePath
        const trueUrl = strGamePath.startsWith('http') ? strGamePath : webServer + strGamePath
        console.log('trueUrl:' + trueUrl)

        //匹配二进制文件
        let binUrl
        if (trueUrl.endsWith("swf")) {
            //处理直接返回swf的情况
            binUrl = trueUrl
        } else {
            //尝试探测swf
            let res = await detect(trueUrl)
            if (res.ok) {
                binUrl = res.val
            } else {
                console.log(res.val)
                //请求真实页面
                let truePage = await fetch(trueUrl, `http://www.4399.com${playingPage}`)
                //匹配其中的游戏文件
                m = truePage.match(/(http?:\/\/)?[^'"\s]+\.(swf|unity3d)/)
                if (m == null) {
                    // return new Err("Error:Can't either try download any swf file or match any bin file, if this is a HTML5 game thus it's not supported yet")
                    console.log("Warning:Can't either try download any swf file or match any bin file, treat as HTML5 game")
                    resolve(new Ok({
                        title,
                        category,
                        type: "h5",
                        fromSite: "4399",
                        online: {
                            originPage: `http://www.4399.com/flash/${id}.htm`,
                            truePage: trueUrl,
                            binUrl: trueUrl,
                            icon: await getIcon(title, id)
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
            fromSite: "4399",
            online: {
                originPage: `http://www.4399.com/flash/${id}.htm`,
                truePage: trueUrl,
                binUrl,
                icon: await getIcon(title, id)
            }
        }))
    })

}

async function getIcon(title: string, id: string): Promise<string | undefined> {
    //生成搜索页面数组
    const searchPage = await fetch("http://so2.4399.com/search/search.php?k=" + GBKEncodeUri(title), "http://www.4399.com")
    const $ = cheerio.load(searchPage)
    let searchResults: SearchResult[] = []
    let child, icon: string | undefined, nodeId
    $('.type_d').each((index, root) => {
        //获取第一个孩子
        child = $(root).children('a').first()
        let m = child.prop('href').match(/\d+\.htm/)
        if (m == null) return
        nodeId = m[0].split('.')[0]

        //获取第一个孙子
        child = child.children('img').first()
        icon = 'http:' + child.prop('src')
        searchResults.push({
            id: nodeId,
            icon
        })
    })

    //查找图标
    icon = undefined
    for (let n of searchResults) {
        if (n.id == id) {
            icon = n.icon
            console.log("Get icon : " + icon)
            break
        }
    }
    if (icon == undefined) console.log("Warning:Can't get icon")
    return icon
}

const detectArray = [
        'main.swf',
        'game.swf',
        'play.swf',
        'mainload.swf'
    ],
    priority: { [playerName: string]: string } = {
        "jifen2.htm": 'main.swf',
        "jifen3.htm": 'mainload.swf',
        "game.htm": 'game.swf',
        "game2.htm": 'play.swf',
        "jifen3d.htm": 'main.swf'
    }

async function detect(trueUrl: string): Promise<Result<string, string>> {
    //解析结尾播放器名称
    let s = trueUrl.split("/")
    let playerName = s[s.length - 1]
    //生成探测序列
    let first: string
    if (priority.hasOwnProperty(playerName)) {
        first = priority[playerName]
    } else {
        console.log("Warning:Unknown player html name : " + playerName)
        first = 'main.swf'
    }
    let seq = [first].concat(detectArray.filter(val => val != first)), url
    for (let swfName of seq) {
        url = trueUrl.replace(playerName, swfName)
        try {
            let r = await axios.head(url, getAxiosConfig(trueUrl))
            console.log(`exist ${url}, response status : ${r.status},content length : ${r.headers['content-length']}`)
            if (r.status < 400 && Number(r.headers['content-length']) > 51200) {
                console.log('use ' + swfName)
                return new Ok(url)
            }
        } catch (e) {
            // fs.writeFileSync('err.json',JSON.stringify(e,null,2))
        }
    }
    return new Err("Can't detect swf file")
}

function parseID(url: string): Result<string, string> {
    let m = url.match(/[\d_]+.htm/)
    if (m == null) return new Err("Error:Not a valid 4399 url")
    else return new Ok(m[0].split(/(_\d)?\./)[0])
}

function getNickName(cookie: string): Result<string, string> {
    let m = cookie.match(/[PQ]nick=[^;]{2,};/)
    if (m == null) {
        m = cookie.match(/Puser=[^;]{2,};/)
        if (m == null) {
            return new Err("Error:Can't match nick name")
        } else {
            return new Ok(GBKDecodeUri(m[0].split(/[=;]/)[1]))
        }
    }
    return new Ok(GBKDecodeUri(m[0].split(/[=;]/)[1]))
}

//4399pvz专题页面的补丁函数
async function pvzPatch(page: string, known: { title: string, category: string, id: string }): Promise<Result<GameInfo, null>> {
    const {title, category} = known
    const url = `http://www.4399.com/flash/${known.id}.htm`
    //查找iframe元素
    let match = page.match(/<iframe.+\.htm.+<\/iframe>/)
    if (!match?.length) {
        return new Err(null)
    }
    const src=match[0].match(/\/.+\.htm/)?.[0]
    if(!src){
        return new Err(null)
    }
    const truePageUrl = fullUrl(src)
    if(!truePageUrl){
        return new Err(null)
    }
    // console.log('truePageUrl',truePageUrl);

    //获取真实页面。匹配swf文件名
    const truePage = await fetch(truePageUrl, url)
    match = truePage.match(/gameswf=.+\.swf/)
    if (match == null) return new Err(null)
    const swfName = match[0].split("=")[1]
    // console.log(swfName);

    //获得二进制真实地址
    let s = truePageUrl.split("/")
    let last = s[s.length - 1]
    const binUrl = truePageUrl.replace(last, swfName)
    // console.log(binUrl);

    //返回结果
    return new Ok({
        title,
        category,
        type: "flash",
        fromSite: "4399",
        online: {
            originPage: url,
            truePage: truePageUrl,
            binUrl,
            icon: await getIcon(known.title, known.id)
        }
    })
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
