import fs from 'fs'
import path from "path";
import type {Config} from "../class";
import configSchema from "./schema/config.json"
import Ajv from "ajv";
import {addLoadErrors} from "./manager"

const ajv = new Ajv()
const configValidator = ajv.compile(configSchema)

const CONFIG_FILE = "config.json"
let config: Config | null = null,
    clear = true

const configPatch = {
    browser: {
        ignoreAlert: true,
        h5: ""
    },
    smartSniffing: {
        enable: false,
        port: 9222,
        arg: "--remote-debugging-port="
    },
    notice: {
        ignore: []
    },
    progressBackup: {
        enable: true
    }
}


function geneInitConfig(): Config {
    return {
        cookies: {},
        search: {
            site: "4399",
            method: "baidu"
        },
        libCheck: true,
        port: 4090,
        recentLaunch: [],
        browser: {
            flash: "",
            unity: "",
            h5: "",
            ignoreAlert: false
        },
        smartSniffing: {
            enable: false,
            port: 9222,
            arg: "--remote-debugging-port="
        },
        notice: {
            ignore: []
        },
        progressBackup: {
            enable: true
        }
    }
}

function fixConfig(config: any, patch: any): any {
    if (typeof config != "object") return config
    for (let key in patch) {
        if (!config.hasOwnProperty(key)) {
            //补充
            config[key] = patch[key]
            console.log(`Fix missing key ${key}`)
        } else if (typeof patch[key] == "object" && !Array.isArray(patch[key])) {
            //递归地补充object
            config[key] = fixConfig(config[key], patch[key])
        }
    }
    return config
}

function getConfig(): Config {
    if (config == null) {
        if (fs.existsSync(CONFIG_FILE)) {
            config = JSON.parse(fs.readFileSync(CONFIG_FILE).toString()) as Config

            //修补
            config = fixConfig(config, configPatch)
            //校验
            if (!configValidator(config)) {
                let msg = 'Config validation failed, use initial one'
                if (configValidator.errors) {
                    msg += '.Error message : ' + JSON.stringify(configValidator.errors[0])
                    // msg += '.Error message : ' + configValidator.errors[0].propertyName + " " + configValidator.errors[0].message
                }
                addLoadErrors(msg)
                config = geneInitConfig()
            }

            //检查一遍 recentLaunch 是否有效
            let s, oldLength = config.recentLaunch.length
            config.recentLaunch = config.recentLaunch.filter(n => {
                s = n.id.split(';')
                return fs.existsSync(path.join('games', s[0], s[1]))
            })
            if (oldLength != config.recentLaunch.length) fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
        } else {
            config = geneInitConfig()

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
    setConfig
}
