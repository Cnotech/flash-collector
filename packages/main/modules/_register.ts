import com7k7k from "./com7k7k";
import {Result} from "ts-results";
import {ParserRegister} from "../../class";

export const register: Array<ParserRegister> = [
    {
        name: "7k7k",
        regex: /https?:\/\/www\.7k7k\.com\/(swf|flash)\/\d+\.htm/,
        entrance: com7k7k.entrance,
        parseID: com7k7k.parseID,
        cookieController: {
            init: com7k7k.initCookie,
            set: com7k7k.setCookie,
            get: com7k7k.getCookie,
            clear: com7k7k.clearCookie
        }
    }
]
