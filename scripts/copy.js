const cp = require('child_process')
const fs = require("fs");

//获取版本号
let pkg = JSON.parse(fs.readFileSync("package.json").toString())
const version = pkg.version

//拷贝
cp.execSync(`xcopy /s /r /y .\\retinue\\* .\\release\\${version}\\win-unpacked\\retinue\\`)

//打包
console.log('Packaging into 7zip...')
cp.execSync(`".\\retinue\\7zip\\7z.exe" a -t7z -mx9 ".\\release\\Flash Collector_${version}_win-x64.7z" .\\release\\${version}\\win-unpacked\\*`)
console.log(`Build stored at ./release/Flash Collector_${version}_win-x64.7z`)
