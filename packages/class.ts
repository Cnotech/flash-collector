import {Result} from "ts-results";

interface GameInfo {
    title: string,
    category: string,
    type: "flash" | "unity" | "h5",
    fromSite: string,
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
    cookieController: {
        init: (cookie: string | null, updateCookieCallback: (cookie: string) => void) => void,
        get: () => Promise<Result<string, string>>,
        set: (cookie: string) => void,
        clear: () => void
    }
}

interface List {
    flash: GameInfo[],
    unity: GameInfo[],
    h5: GameInfo[]
}

export {
    GameInfo,
    ParserRegister,
    List
}
