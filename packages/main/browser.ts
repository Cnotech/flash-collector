import fs from 'fs'
import path from "path";
import {Browser} from "../class";
import {None, Option, Some} from "ts-results";
import {dialog} from "electron";

const LOCAL_APPDATA = process.env['LOCALAPPDATA'] ?? "",
    ROAMING_APPDATA = process.env['APPDATA'] ?? "",
    SYSTEM_DRIVE=process.env['SystemDrive']??""

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
    },
    {
        name: "百分浏览器",
        allowedPaths: [
            path.join(LOCAL_APPDATA, 'CentBrowser\\Application\\chrome.exe')
        ],
        trait: {
            flash: true,
            unity: false,
            debug: "--remote-debugging-port="
        }
    },
    {
        name: "QQ浏览器",
        allowedPaths: [
            path.join(SYSTEM_DRIVE, "Program Files (x86)\\Tencent\\QQBrowser\\QQBrowser.exe"),
            path.join(SYSTEM_DRIVE, "Program Files\\Tencent\\QQBrowser\\QQBrowser.exe"),
        ],
        trait: {
            flash: true,
            unity: false,
            debug: "--remote-debugging-port="
        }
    },
    {
        name: "Chrome",
        allowedPaths: [
            path.join(SYSTEM_DRIVE, "Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"),
            path.join(SYSTEM_DRIVE, "Program Files\\Google\\Chrome\\Application\\chrome.exe"),
        ],
        trait: {
            flash: false,
            unity: false,
            debug: "--remote-debugging-port="
        }
    },
    {
        name: "Firefox",
        allowedPaths: [
            path.join(SYSTEM_DRIVE, "Program Files (x86)\\Mozilla Firefox\\firefox.exe"),
            path.join(SYSTEM_DRIVE, "Program Files\\Mozilla Firefox\\firefox.exe"),
        ],
        trait: {
            flash: false,
            unity: false,
            debug: "--remote-debugging-port="
        }
    },
    {
        name: "Edge (Chromium)",
        allowedPaths: [
            path.join(SYSTEM_DRIVE, "Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"),
            path.join(SYSTEM_DRIVE, "Program Files\\Microsoft\\Edge\\Application\\msedge.exe"),
        ],
        trait: {
            flash: false,
            unity: false,
            debug: "--remote-debugging-port="
        }
    },
    {
        name: "星愿浏览器",
        allowedPaths: [
            path.join(SYSTEM_DRIVE, "Program Files (x86)\\Twinkstar Browser\\twinkstar.exe"),
            path.join(SYSTEM_DRIVE, "Program Files\\Twinkstar Browser\\twinkstar.exe"),
        ],
        trait: {
            flash: false,
            unity: false,
            debug: "--remote-debugging-port="
        }
    },
    {
        name: "傲游浏览器",
        allowedPaths: [
            path.join(LOCAL_APPDATA, "Maxthon\\Application\\Maxthon.exe"),
        ],
        trait: {
            flash: false,
            unity: false,
            debug: "--remote-debugging-port="
        }
    },
    {
        name: "Opera",
        allowedPaths: [
            path.join(LOCAL_APPDATA, "Programs\\Opera\\launcher.exe"),
        ],
        trait: {
            flash: false,
            unity: false,
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
