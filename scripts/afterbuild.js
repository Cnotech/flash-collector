const cp = require('child_process')
const fs = require("fs");
const shelljs = require('shelljs')
const path = require("path");

function afterBuild(compressLevel) {
    //获取版本号
    let pkg = JSON.parse(fs.readFileSync("package.json").toString())
    const version = pkg.version

    //精简
    const reduceList = [
        "d3dcompiler_47.dll",
        "LICENSE.electron.txt",
        "LICENSES.chromium.html",
        "vk_swiftshader.dll",
        "vk_swiftshader_icd.json",
        "vulkan-1.dll",
        "locales/am.pak",
        "locales/ar.pak",
        "locales/bg.pak",
        "locales/bn.pak",
        "locales/ca.pak",
        "locales/cs.pak",
        "locales/da.pak",
        "locales/de.pak",
        "locales/el.pak",
        "locales/es-419.pak",
        "locales/es.pak",
        "locales/et.pak",
        "locales/fa.pak",
        "locales/fi.pak",
        "locales/fil.pak",
        "locales/fr.pak",
        "locales/gu.pak",
        "locales/he.pak",
        "locales/hi.pak",
        "locales/hr.pak",
        "locales/hu.pak",
        "locales/id.pak",
        "locales/it.pak",
        "locales/ja.pak",
        "locales/kn.pak",
        "locales/ko.pak",
        "locales/lt.pak",
        "locales/lv.pak",
        "locales/ml.pak",
        "locales/mr.pak",
        "locales/ms.pak",
        "locales/nb.pak",
        "locales/nl.pak",
        "locales/pl.pak",
        "locales/pt-BR.pak",
        "locales/pt-PT.pak",
        "locales/ro.pak",
        "locales/ru.pak",
        "locales/sk.pak",
        "locales/sl.pak",
        "locales/sr.pak",
        "locales/sv.pak",
        "locales/sw.pak",
        "locales/ta.pak",
        "locales/te.pak",
        "locales/th.pak",
        "locales/tr.pak",
        "locales/uk.pak",
        "locales/vi.pak",
        "locales/zh-TW.pak",
        "locales/en-GB.pak"
    ]
    for (let item of reduceList) {
        shelljs.rm(path.join("release", version, "win-unpacked", item))
    }

    //拷贝
    cp.execSync(`xcopy /s /r /y .\\retinue\\* .\\release\\${version}\\win-unpacked\\retinue\\`)

    //打包
    console.log('Packaging into 7zip...')
    cp.execSync(`".\\retinue\\7zip\\7z.exe" a -t7z -mx${compressLevel} ".\\release\\Flash Collector_${version}_win-x64.7z" .\\release\\${version}\\win-unpacked\\*`)
    console.log(`Build stored at ./release/Flash Collector_${version}_win-x64.7z`)
}

module.exports = {
    afterBuild
}
