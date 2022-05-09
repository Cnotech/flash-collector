import bridge from "./bridge";
import {Config} from "../../class";

async function getConfig(): Promise<Config> {
    return bridge('getConfig')
}

function setConfig(config: Config) {
    bridge('setConfig', config)
}

export {
    setConfig,
    getConfig
}
