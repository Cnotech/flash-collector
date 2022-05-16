// ==UserScript==
// @name        Flash Collector Script
// @namespace   Flash Collector Scripts
// @match       *://*.4399.com/*
// @match       *://*.7k7k.com/*
// @grant       none
// @license MPL-2.0
// @version     1.1
// @author      Cnotech
// @description Flash Collector 用户脚本，用于解除 4399.com 的源站播放 Referer 限制、增加源站播放标题
// ==/UserScript==

function query(key) {
    let m = window.location.href.match(new RegExp(`[?|&]${key}=[^&]*`))

    if (m == null) return null
    else return m[0].split("=")[1]
}

function jump(url) {
    console.log(`Jump to ${url}`)
    document.location.href = url
}

function setTitle() {
    let t = query("title")
    if (t != null) {
        const title = decodeURI(t)
        let titleTags = document.getElementsByTagName('title')
        if (titleTags.length === 0) {
            let tag = document.createElement("title")
            tag.innerText = title
            document.getElementsByTagName('body')[0].appendChild(tag)
        } else {
            titleTags[0].innerText = title
        }
        document.title = title
    }
}

function com4399() {
    //读取hash
    const hash = document.location.hash

    //匹配标记
    let m = hash.match(/#flash-collector-\d/)
    if (m == null) return
    let step = Number(m[0].slice(-1))

    //状态机
    const cur = document.location.href.split("#")[0]
    switch (step) {
        case 0:
            //跳转到 4399 首页
            jump(`http://www.4399.com/#flash-collector-1?next=${cur}&title=${query("title")}`)
            break
        case 1:
            //跳回真实页面
            let n = query("next")
            if (n) jump(n + `#flash-collector-2?title=${query("title")}`)
            break
        case 2:
            //配置标题
            setTitle()
    }
}

function com7k7k() {
    //配置标题
    setTitle()
}

function main() {
    const url = window.location.href
    if (url.indexOf("4399.com") > -1) {
        com4399()
    } else if (url.indexOf("7k7k.com") > -1) {
        com7k7k()
    }
}

main()
