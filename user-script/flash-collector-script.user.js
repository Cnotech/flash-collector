// ==UserScript==
// @name        Flash Collector Script
// @namespace   Flash Collector Scripts
// @match       *://*.4399.com/*
// @match       *://*.7k7k.com/*
// @match       *://*.game773.com/*
// @grant       none
// @license MPL-2.0
// @version     1.3
// @author      Cnotech
// @description Flash Collector 用户脚本，用于解除 4399.com 的源站播放 Referer 限制、增加源站播放标题
// ==/UserScript==

function enlargeNativeFlash() {
    document.getElementsByTagName("embed")[0].setAttribute("height", `${document.documentElement.scrollHeight}px`)
}

function query(key) {
    let m = window.location.href.match(new RegExp(`[?|&]${key}=[^&]*`))

    if (m == null) return null
    else return m[0].split("=")[1]
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
    //判断状态
    const url = document.location.href
    if (url.indexOf("#flash-collector-0") !== -1) {
        //重载页面
        document.location.href = url.replace("#flash-collector-0", "")
    } else {
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
    //撑大原始flash
    let u = new URL(url)
    if (u.pathname.endsWith(".swf")) {
        enlargeNativeFlash()
    }
}

main()
