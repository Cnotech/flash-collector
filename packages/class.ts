import {Result} from "ts-results";

interface GameInfo {
    title: string,
    category: string,
    type: "flash" | "unity" | "h5",
    fromSite: string, //此值需要与模块名称相同
    online: {
        originPage: string,
        truePage: string,
        binUrl: string,
        icon?: string
    },
    local?: {
        binFile: string,
        folder: string,
        icon?: string
    }
}

interface ParserRegister {
    //站点名称，例如 "4399"
    name: string,
    //支持解析的 URL 正则表达式
    regex: RegExp,
    //解析入口，输入一个 URL，输出 GameInfo；
    // 注意若此时没有 Cookie 则需要在函数内先调用获取 Cookie 函数并通过 Cookie 更新回调通知上层
    entrance: (url: string) => Promise<Result<GameInfo, string>>,
    //工具函数
    utils: {
        //解析游戏 ID，输入一个 URL，输出一个能唯一索引此游戏的 ID
        parseID: (url: string) => Result<string, string>,
        //解析用户昵称，输入 Cookie 字符串，输出解码后的用户昵称
        getNickName: (cookie: string) => Result<string, string>,
    },
    //Cookie 控制器，用于管理该站点的 Cookie
    cookieController: {
        //初始化
        // cookie：当用户已登录则会传入一个 Cookie，否则传入 null；
        // updateCookieCallback：一个 Cookie 更新回调，当模块内部更新 Cookie 时调用此回调函数通知上层
        init: (cookie: string | null, updateCookieCallback: (cookie: string) => void) => void,
        //获取 Cookie，此函数通常是在用户主动点击“登录”按钮时被外部调用
        get: () => Promise<Result<string, string>>,
        //设定 Cookie，要求调用此函数时覆盖模块内部的 Cookie
        set: (cookie: string) => void,
        //清除模块内部的 Cookie
        clear: () => void
    }
}

interface List {
    // type有效枚举：flash , unity , h5
    [type: string]: GameInfo[]
}

interface Request {
    id: number,
    functionName: string,
    args: any
}

interface Reply {
    id: number,
    payload: any
}

interface Config {
    cookies: { [site: string]: string },
    search: {
        site: string,
        method: string
    },
    libCheck: boolean,
    port: number,
    recentLaunch: { id: string, freq: number }[],
    browser: {
        flash: string,
        unity: string,
        h5: string,
        ignoreAlert: boolean
    },
    smartSniffing: {
        enable: boolean,
        port: number,
        arg: string
    },
    notice: {
        ignore: string[]
    }
}

interface LoginStatus {
    name: string,
    login: boolean,
    nickName: string
}

interface Browser {
    name: string,
    allowedPaths: string[],
    trait: {
        flash: boolean,
        unity: boolean,
        debug: string | 'disable' | 'unknown'
    },
    location?: {
        flashCache?: string
    }
}

interface Notice {
    id: string,
    lower_than: string,
    level: string,
    message: string,
    description: string,
    close_text: string,
    allow_ignore: boolean,
}

interface UpdateReply {
    package: {
        full: string,
        update: string,
        extended_update: string
    },
    latest: {
        page: string,
        version: string
    },
    update: {
        allow_normal_since: string,
        force_update_until: string,
        wide_gaps: string[]
    },
    notice: Notice[]
}

interface ProgressEnable {
    flashIndividual: boolean,
    flashBrowser: boolean,
    unity: boolean,
    h5Import: boolean
}

export {
    GameInfo,
    ParserRegister,
    List,
    Request,
    Reply,
    LoginStatus,
    Config,
    Browser,
    UpdateReply,
    Notice,
    ProgressEnable
}
