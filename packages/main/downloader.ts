import {Result, Ok, Err} from "ts-results";
import axios from 'axios';
import {GameInfo} from "../class";

function get7k7kTime(): string {
    const myDateDays = new Date();
    const myDateYearOne = myDateDays.getFullYear().toString();
    const myDateMonthOne = myDateDays.getMonth().toString();
    const myDateDayOne = myDateDays.getDate().toString();
    const myDateHoursOne = myDateDays.getHours().toString();
    const myDateMinutesOne = myDateDays.getMinutes().toString();
    return myDateYearOne + myDateMonthOne + myDateDayOne + myDateHoursOne + myDateMinutesOne;
}

async function sevenK(url: string, cookie: string): Promise<Result<GameInfo, string>> {
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
        return new Err("Error:Request 7k7k api failed, try again later")
    }
    const trueUrl = json.result.url as string, gameType = json.result.gameType
    let type: "flash" | "unity" | "h5"
    if (gameType == 6) {
        type = "flash"
    } else if (gameType == 1) {
        type = "unity"
    } else type = "h5"

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


    return new Ok({
        title,
        category,
        type,
        online: {
            originPage: url,
            truePage: trueUrl,
            binUrl
        }
    })
}

export {
    sevenK
}
