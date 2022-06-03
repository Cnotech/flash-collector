import path from 'path'
import fs from 'fs'
import {ProgressEnable} from "../class";
import {getConfig} from "./config";
import {getBrowserNode} from "./browser";

const ROAMING_APPDATA = process.env['APPDATA'] ?? ""

let targetInfo = {
    FLASH_LOCAL_WITH_NET: "",
    FLASH_LOCALHOST: "",
    UNITY_WEB_PLAYER_PREFS: ""
}

function initProgressModule(): ProgressEnable {
    let res: ProgressEnable = {
        flashIndividual: false,
        flashBrowser: false,
        unity: false,
        h5Import: false
    }
    let config = getConfig()
    //判断flash
    const SharedObjects = path.join(ROAMING_APPDATA, 'Macromedia', 'Flash Player', '#SharedObjects')
    const CwdAppend = process.cwd().split('\\').slice(1).concat(['games', 'flash'])
    if (fs.existsSync(SharedObjects)) {
        //遍历随机文件夹
        let p1, p2
        for (let randomFolder of fs.readdirSync(SharedObjects)) {
            p1 = path.join(SharedObjects, randomFolder, '#localWithNet', ...CwdAppend)
            p2 = path.join(SharedObjects, randomFolder, 'localhost', ...CwdAppend)
            if (fs.existsSync(p1) || fs.existsSync(p2)) {
                res.flashIndividual = true
                targetInfo.FLASH_LOCAL_WITH_NET = p1
                targetInfo.FLASH_LOCALHOST = p2
            }
        }
    }
    if (getBrowserNode(config.browser.flash).location?.flashCache) {
        res.flashBrowser = true
    }

    //判断unity
    let p3 = path.join(ROAMING_APPDATA, 'Unity', 'WebPlayerPrefs')
    if (fs.existsSync(p3)) {
        targetInfo.UNITY_WEB_PLAYER_PREFS = p3
        res.unity = true
    }

    //判断h5启动浏览器是否支持CDP
    if (getBrowserNode(config.browser.h5).trait.debug) {
        res.h5Import = true
    }

    // console.log(targetInfo)
    return res
}

export {
    initProgressModule
}
