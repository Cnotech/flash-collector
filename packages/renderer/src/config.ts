import bridge from "./bridge";
import {Config} from "../../class";

async function getConfig(): Promise<Config> {
    return bridge('getConfig')
}

function setConfig(config: Config, emergency: boolean) {
    bridge('setConfig', config, emergency)
}

export {
    setConfig,
    getConfig
}
