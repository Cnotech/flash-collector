import com7k7k from "./com7k7k"
import com4399 from "./com4399"
import game773 from "./game773"
import com17yy from "./com17yy"
import com7724 from "./com7724"
import {ParserRegister} from "../../class"

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
            clear: com4399.clearCookie,
        },
    },
    {
        name: "7k7k",
        regex: /.+\.7k7k\.com.+/,
        entrance: com7k7k.entrance,
        utils: {
            parseID: com7k7k.parseID,
            getNickName: com7k7k.getNickName,
        },
        cookieController: {
            init: com7k7k.initCookie,
            set: com7k7k.setCookie,
            get: com7k7k.getCookie,
            clear: com7k7k.clearCookie,
        },
    },
    game773,
    {
        name: "17yy",
        regex: /https?:\/\/www\.17yy\.com\/f\/(play\/)?\d+\.htm/,
        entrance: com17yy.entrance,
        utils: {
            parseID: com17yy.parseID,
            getNickName: com17yy.getNickName,
        },
        cookieController: {
            init: com17yy.initCookie,
            set: com17yy.setCookie,
            get: com17yy.getCookie,
            clear: com17yy.clearCookie,
        },
    },
    {
        name: "7724",
        regex: /https?:\/\/www\.7724\.com\/\S+/,
        entrance: com7724.entrance,
        utils: {
            parseID: com7724.parseID,
            getNickName: com7724.getNickName,
        },
        cookieController: {
            init: com7724.initCookie,
            set: com7724.setCookie,
            get: com7724.getCookie,
            clear: com7724.clearCookie,
        },
    },
]
