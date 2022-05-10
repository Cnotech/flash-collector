import fs from 'fs'
import path from "path";
import type {Config} from "../class";

const CONFIG_FILE = "config.json"
let config: Config | null = null,
    clear = true

function getConfig(): Config {
    if (config == null) {
        if (fs.existsSync(CONFIG_FILE)) {
            config = JSON.parse(fs.readFileSync(CONFIG_FILE).toString()) as Config

            //检查一遍 recentLaunch 是否有效
            let s, oldLength = config.recentLaunch.length
            config.recentLaunch = config.recentLaunch.filter(n => {
                s = n.id.split(';')
                return fs.existsSync(path.join('games', s[0], s[1]))
            })
            if (oldLength != config.recentLaunch.length) fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
        } else {
            config = {
                cookies: {},
                search: {
                    site: "4399",
                    method: "baidu"
                },
                libCheck: true,
                port: 3000,
                recentLaunch: []
            }

        }
    }
    return config
}

function setConfig(c: Config, emergency: boolean) {
    config = c
    if (emergency) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
    } else {
        clear = false
    }
}

setInterval(() => {
    if (!clear) {
        console.log('write lazy data')
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
        clear = true
    }
}, 60000)

export {
    getConfig,
    setConfig,
    config
}
