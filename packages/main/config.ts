import fs from 'fs'
import type {Config} from "../class";

const CONFIG_FILE = "config.json"
let config: Config | null = null

function getConfig(): Config {
    if (config == null) {
        config = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE).toString()) as Config : {
            cookies: {},
            search: {
                site: "4399",
                method: "baidu"
            },
            libCheck: true,
            port: 3000
        }
    }
    return config
}

function setConfig(c: Config) {
    config = c
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export {
    getConfig,
    setConfig,
    Config
}
