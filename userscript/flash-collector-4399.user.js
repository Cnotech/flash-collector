// ==UserScript==
// @name        Flash Collector for 4399
// @namespace   Flash Collector Scripts
// @match       *://*.4399.com/*
// @grant       none
// @license MPL-2.0
// @version     1.0
// @author      Cnotech
// @description Flash Collector 辅助脚本，用于解除 4399.com 的源站播放限制
// ==/UserScript==

function next() {
    let m=document.location.hash.match(/next=[^&]+/)
    if(m==null) return null
    return m[0].split("=")[1]
}

function jump(url) {
    console.log(`Jump to ${url}`)
    document.location.href=url
}

function main() {
    //读取hash
    const hash=document.location.hash

    //匹配标记
    let m=hash.match(/#flash-collector-\d/)
    if(m==null) return
    let step=Number(m[0].slice(-1))

    //状态机
    const cur=document.location.href.split("#")[0]
    switch (step) {
        case 0:
            //跳转到 4399 首页
            jump(`http://www.4399.com/#flash-collector-1?next=${cur}`)
            break
        case 1:
            //跳回真实页面
            let n=next()
            if(n) jump(n)
            break
    }
}
main()
