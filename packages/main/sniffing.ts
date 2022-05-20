import {Err, Ok, Result} from "ts-results";
import {getConfig} from "./config";
import {Notification} from "electron"

const CDP = require('chrome-remote-interface');

async function sniffing(url: string): Promise<Result<string[], string>> {
    const port = (await getConfig()).smartSniffing.port
    let working = true
    showNotification()
    return new Promise(async (res) => {
        let client,
            resource: string[] = []
        try {
            client = await CDP({
                port
            });
            const {Network, Page} = client
            Network.requestWillBeSent((params: any) => {
                if (!working) return
                console.log(params.request.url)
                resource.push(params.request.url)
            });
            await Network.enable()
            client.on('disconnect', () => {
                working = false
                res(new Ok(resource))
            })
            await Page.enable();
            await Page.navigate({url});
            await Page.loadEventFired();
        } catch (err) {
            res(new Err(JSON.stringify(err)))
        }
    })
}

function sleep(ms: number): Promise<void> {
    return new Promise(res => {
        setTimeout(res, ms)
    })
}

function showNotification() {
    new Notification({title: "正在嗅探异步加载的 Flash 资源", body: "关闭浏览器以结束嗅探"}).show()
}

export {
    sniffing
}
