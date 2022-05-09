import {Result} from "ts-results";

interface GameInfo {
    title: string,
    category: string,
    type: "flash" | "unity" | "h5",
    fromSite: string, //此值需要与模块名称相同
    online: {
        originPage: string,
        truePage: string,
        binUrl: string
    },
    local?: {
        binFile: string,
        folder: string
    }
}

interface ParserRegister {
    name: string,
    regex: RegExp,
    entrance: (url: string) => Promise<Result<GameInfo, string>>,
    parseID: (url: string) => Result<string, string>,
    getNickName: (cookie: string) => Result<string, string>,
    cookieController: {
        init: (cookie: string | null, updateCookieCallback: (cookie: string) => void) => void,
        get: () => Promise<Result<string, string>>,
        set: (cookie: string) => void,
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
}

interface LoginStatus {
    name: string,
    login: boolean,
    nickName: string
}

export {
    GameInfo,
    ParserRegister,
    List,
    Request,
    Reply,
    LoginStatus,
    Config
}
