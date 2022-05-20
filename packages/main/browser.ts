import fs from 'fs'
import path from "path";
import {Browser} from "../class";
import {None, Option, Some} from "ts-results";
import {dialog} from "electron";

const LOCAL_APPDATA = process.env['LOCALAPPDATA'] ?? "",
    ROAMING_APPDATA = process.env['APPDATA'] ?? ""

const browserList: Browser[] = [
    {
        name: "360极速浏览器X",
        allowedPaths: [
            path.join(LOCAL_APPDATA, '360ChromeX\\Chrome\\Application\\360ChromeX.exe')
        ],
        trait: {
            flash: true,
            unity: true,
            debug: "--remote-debugging-port="
        }
    },
    {
        name: "360极速浏览器",
        allowedPaths: [
            path.join(LOCAL_APPDATA, '360Chrome\\Chrome\\Application\\360chrome.exe')
        ],
        trait: {
            flash: true,
            unity: true,
            debug: "--remote-debugging-port="
        }
    },
    {
        name: "搜狗高速浏览器",
        allowedPaths: [
            path.join(LOCAL_APPDATA, 'SogouExplorer\\SogouExplorer.exe')
        ],
        trait: {
            flash: true,
            unity: false,
            debug: "disable"
        }
    },
    {
        name: "360安全浏览器",
        allowedPaths: [
            path.join(ROAMING_APPDATA, '360se6\\Application\\360se.exe')
        ],
        trait: {
            flash: true,
            unity: true,
            debug: "--remote-debugging-port="
        }
    }
]

//获取全部可用的浏览器
function getAvailableBrowsers(): Browser[] {
    let res: Browser[] = []
    for (let n of browserList) {
        for (let p of n.allowedPaths) {
            if (fs.existsSync(p)) {
                res.push(n)
                break
            }
        }
    }
    return res
}

//解析出一个可用路径
function parseBrowserPath(availableBrowser: string): Option<string> {
    if (availableBrowser == "") return new Some("")
    for (let n of browserList) {
        if (n.name == availableBrowser) {
            for (let p of n.allowedPaths) {
                if (fs.existsSync(p)) return new Some(p)
            }
        }
    }
    return None
}

//由路径查找浏览器昵称
function getBrowserNickName(inputPath: string): string {
    if (inputPath == '') return "默认浏览器"
    for (let n of browserList) {
        for (let p of n.allowedPaths) {
            if (p == inputPath) {
                return n.name
            }
        }
    }
    return "自定义浏览器"
}

//自定义浏览器路径
async function chooseBrowser(): Promise<Option<string>> {
    let r = await dialog.showOpenDialog({
        title: "选择自定义浏览器",
        filters: [
            {
                name: "可执行程序",
                extensions: ['exe']
            }
        ]
    })
    if (r.canceled) return None
    else return new Some(r.filePaths[0])
}

export {
    getAvailableBrowsers,
    parseBrowserPath,
    getBrowserNickName,
    chooseBrowser
}
