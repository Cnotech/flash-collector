import com7k7k from "./com7k7k";
import {GameInfo} from "../../class";

const testMap: Record<string, GameInfo> = {
    "http://news.7k7k.com/mxw/zjwdssb.html": {
        "title": "冒险王之神兵传奇终极无敌速升版",
        "category": "专题",
        "type": "flash",
        "fromSite": "7k7k",
        "online": {
            "originPage": "http://news.7k7k.com/mxw/zjwdssb.html",
            "truePage": "http://flash.7k7k.com/cms/cms10/20120827/1508559644/1/gameload.html",
            "binUrl": "http://flash.7k7k.com/cms/cms10/20120827/1508559644/1/gameload.swf"
        }
    },
    "http://news.7k7k.com/mxw/srbtb.html": {
        "title": "冒险王双人变态版",
        "category": "专题",
        "type": "flash",
        "fromSite": "7k7k",
        "online": {
            "originPage": "http://news.7k7k.com/mxw/srbtb.html",
            "truePage": "http://flash.7k7k.com/fl_9/20101223/testyy2013.htm",
            "binUrl": "http://flash.7k7k.com/fl_9/20101223/testyy.swf"
        }
    },
    "http://www.7k7k.com/flash/15735.htm": {
        "title": "7k7k黄金矿工单人版小游戏",
        "category": "专题",
        "type": "flash",
        "fromSite": "7k7k",
        "online": {
            "originPage": "http://www.7k7k.com/flash/15735.htm",
            "truePage": "http://flash.7k7k.com/fl_8/20100913/huangjin/back2back_110325.html",
            "binUrl": "http://flash.7k7k.com/fl_8/20100913/huangjin/back2back.swf",
            "icon": "https://i2.7k7kimg.cn/game/7070/16/15735_287005.jpg"
        }
    },
    "http://www.7k7k.com/flash/14594.htm": {
        "title": "黄金矿工",
        "category": "休闲",
        "type": "flash",
        "fromSite": "7k7k",
        "online": {
            "originPage": "http://www.7k7k.com/flash/14594.htm",
            "truePage": "http://flash.7k7k.com/fl_5/hao123/huangjinkuanggong2005.swf",
            "binUrl": "http://flash.7k7k.com/fl_5/hao123/huangjinkuanggong2005.swf",
            "icon": "https://i2.7k7kimg.cn/game/7070/15/14594_261119.jpg"
        }
    },
    "http://www.7k7k.com/flash/129418.htm": {
        "title": "Q版泡泡堂7",
        "category": "敏捷",
        "type": "flash",
        "fromSite": "7k7k",
        "online": {
            "originPage": "http://www.7k7k.com/flash/129418.htm",
            "truePage": "http://flash.7k7k.com/cms/cms10/20140321/1107214259/4.swf",
            "binUrl": "http://flash.7k7k.com/cms/cms10/20140321/1107214259/4.swf",
            "icon": "https://i1.7k7kimg.cn/cms/cms10/20210303/165545_4991.jpg"
        }
    },
    "http://www.7k7k.com/flash/16462.htm": {
        "title": "疯狂小人战斗",
        "category": "敏捷",
        "type": "flash",
        "fromSite": "7k7k",
        "online": {
            "originPage": "http://www.7k7k.com/flash/16462.htm",
            "truePage": "http://flash.7k7k.com/cms/cms10/20121024/1427328492/4.swf",
            "binUrl": "http://flash.7k7k.com/cms/cms10/20121024/1427328492/4.swf",
            "icon": "https://i2.7k7kimg.cn/game/7070/17/16462_213321.jpg"
        }
    },
    "http://www.7k7k.com/swf/26096.htm": {
        "title": "植物大战僵尸",
        "category": "战争",
        "type": "flash",
        "fromSite": "7k7k",
        "online": {
            "originPage": "http://www.7k7k.com/flash/26096.htm",
            "truePage": "http://flash.7k7k.com/fl_7/20090929/28/pvz_9_15_110325.htm",
            "binUrl": "http://flash.7k7k.com/fl_7/20090929/28/pvz_9_15.swf",
            "icon": "https://i5.7k7kimg.cn/game/7070/27/26096_942073.jpg"
        }
    },
    "http://www.7k7k.com/flash/111460.htm": {
        "title": "乐高忍者最终之战",
        "category": "动作",
        "type": "unity",
        "fromSite": "7k7k",
        "online": {
            "originPage": "http://www.7k7k.com/flash/111460.htm",
            "truePage": "http://flash.7k7k.com/cms/cms10/20130522/1531254229/dd/lego.html",
            "binUrl": "http://flash.7k7k.com/cms/cms10/20130522/1531254229/dd/lego.unity3d",
            "icon": "https://i2.7k7kimg.cn/game/7070/112/111460_424848.jpg"
        }
    }
}

test("7k7k", async () => {
    //初始化模块
    com7k7k.initCookie("", () => {
    })
    //逐一测试用例
    for (const url in testMap) {
        const expected = testMap[url]
        expect((await com7k7k.entrance(url)).val).toEqual(expected)
    }
})