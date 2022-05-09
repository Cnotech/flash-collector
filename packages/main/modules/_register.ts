import com7k7k from "./com7k7k";
import com4399 from "./com4399";
import {ParserRegister} from "../../class";

export const register: Array<ParserRegister> = [
    {
        name: "4399",
        regex: /https?:\/\/www\.4399\.com\/flash\/[\d_]+\.htm/,
        entrance: com4399.entrance,
        utils: {
            parseID: com4399.parseID,
            getNickName: com4399.getNickName,
        },
        cookieController: {
            init: com4399.initCookie,
            set: com4399.setCookie,
            get: com4399.getCookie,
            clear: com4399.clearCookie
        }
    },
    {
        name: "7k7k",
        regex: /https?:\/\/www\.7k7k\.com\/(swf|flash)\/\d+\.htm/,
        entrance: com7k7k.entrance,
        utils: {
            parseID: com7k7k.parseID,
            getNickName: com7k7k.getNickName,
        },
        cookieController: {
            init: com7k7k.initCookie,
            set: com7k7k.setCookie,
            get: com7k7k.getCookie,
            clear: com7k7k.clearCookie
        }
    }
]
