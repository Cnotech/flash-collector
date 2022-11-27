const shelljs = require('shelljs')
const readline = require('readline')
const fs = require('fs')
const cp = require('child_process')

const {afterBuild} = require('./afterbuild')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function ask(tip) {
    return new Promise((resolve => {
        rl.question(tip, (answer) => {
            resolve(answer);
        });
    }));
}

async function main() {
    //检查rclone
    try {
        cp.execSync('rclone ls "pineapple:/hdisk/flash collector/FC"')
    } catch (e) {
        console.log("Error:Install rclone then set pineapple first")
        return
    }
    //读取版本号
    const version = JSON.parse(fs.readFileSync("package.json").toString()).version
    console.log(`Publish Flash Collector ${version}`)

    //读取配置
    let config = JSON.parse(fs.readFileSync("./update-server/config.json").toString())
    fs.writeFileSync("./update-server/config.json.bak", JSON.stringify(config, null, 2))

    //询问更新方式
    let r = await ask(`Which update method should this version apply?：
    \n 1.Normal（default）
    \n 2.Extended
    \n 3.Full
    `)
    if (r === "") r = "1"
    if (r !== "1" && r !== "2" && r !== "3") {
        console.log('Invalid input')
        return
    }

    //更改配置
    switch (Number(r)) {
        case 1:
            break
        case 2:
            config.update.allow_normal_since = version
            break
        case 3:
            config.update.wide_gaps.push(version)
            break
    }
    fs.writeFileSync("./update-server/config.json", JSON.stringify(config, null, 2))

    //生成全量包
    console.log("Building...")
    cp.execSync("yarn prebuild && electron-builder")
    afterBuild(9)

    //生成更新包
    console.log("Generating update packages...")
    shelljs.rm("-f", "./release/update.7z")
    shelljs.rm("-f", "./release/extended_update.7z")
    cp.execSync(`".\\retinue\\7zip\\7z.exe" a -t7z -mx9 ".\\release\\update.7z" .\\release\\${version}\\win-unpacked\\resources\\app.asar`)
    cp.execSync(`".\\retinue\\7zip\\7z.exe" a -t7z -mx9 ".\\release\\extended_update.7z" .\\release\\${version}\\win-unpacked\\retinue .\\release\\${version}\\win-unpacked\\resources`)

    //上传
    console.log("Uploading update packages...")
    cp.execSync(`rclone copy "./update-server/config.json" "pineapple:/hdisk/flash collector"`)
    cp.execSync(`rclone copy "./release/update.7z" "pineapple:/hdisk/flash collector/FC/update"`)
    cp.execSync(`rclone copy "./release/extended_update.7z" "pineapple:/hdisk/flash collector/FC/update"`)
    console.log("Uploading full package...")
    cp.execSync(`rclone copy "./release/Flash Collector_${version}_win-x64.7z" "pineapple:/hdisk/flash collector/FC"`)
}

main()
    .then(() => process.exit(0))
