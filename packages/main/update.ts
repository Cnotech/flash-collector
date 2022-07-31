import {release} from "./p7zip";
import {enableUpdate} from "./index";
import {Err, Ok, Result} from "ts-results";
import fs from "fs"
import path from "path"
import Downloader from "nodejs-file-downloader";
import shelljs from "shelljs";

async function update(pkg: string, latestVersion: string): Promise<Result<null, string>> {
    //清空更新文件夹
    if (fs.existsSync("TEMP/UPDATE-TEMP")) shelljs.rm("-rf", "TEMP/UPDATE-TEMP")
    shelljs.mkdir("-p", "TEMP/UPDATE-TEMP")

    //下载更新压缩包
    const sp = pkg.split("/")
    let downloadedFileName = sp[sp.length - 1]
    const d = new Downloader({
        url: pkg,
        directory: "TEMP/UPDATE-TEMP",
        onBeforeSave(finalName: string) {
            downloadedFileName = finalName
        }
    })
    try {
        await d.download();
    } catch (error) {
        console.log(error);
        return new Err("Error:Can't download patch：" + pkg)
    }

    //解压
    let r = await release("TEMP/UPDATE-TEMP/" + downloadedFileName, "TEMP/UPDATE-TEMP/release")
    if (!r) {
        return new Err("Error:Can't release patch")
    }

    //复制更新脚本
    shelljs.cp(path.join("retinue", "update", "main.cmd"), "main.cmd")

    //使能热更新
    enableUpdate(latestVersion)

    return new Ok(null)
}

export {
    update
}
