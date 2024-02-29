import {GameInfo} from "../../class";
import com4399 from "./com4399";

const testMap: Record<string, GameInfo> = {
    "https://www.4399.com/flash/223745.htm": {
        "title": "冰娃与火娃6",
        "category": "冒险",
        "type": "h5",
        "fromSite": "4399",
        "online": {
            "originPage": "http://www.4399.com/flash/223745.htm",
            "truePage": "http://sxiao.4399.com/4399swf/upload_swf/ftp41/cwb/20221213/01/index.htm",
            "binUrl": "http://sxiao.4399.com/4399swf/upload_swf/ftp41/cwb/20221213/01/index.htm",
            "icon": "http://imga1.5054399.com/upload_pic/2021/11/17/4399_09480196660.jpg"
        }
    },
    "https://www.4399.com/flash/210765.htm": {
        "title": "萝卜保卫战3",
        "category": "策略",
        "type": "h5",
        "fromSite": "4399",
        "online": {
            "originPage": "http://www.4399.com/flash/210765.htm",
            "truePage": "http://sda.4399.com/4399swf/upload_swf/ftp31/liuxinyu/20200114/3/index_https.html",
            "binUrl": "http://sda.4399.com/4399swf/upload_swf/ftp31/liuxinyu/20200114/3/index_https.html",
            "icon": "http://imga1.5054399.com/upload_pic/2020/1/14/4399_14181208208.jpg"
        }
    },
    "https://www.4399.com/flash/125229.htm#search3-824e": {
        "title": "忍者斩铁剑1.9",
        "category": "敏捷",
        "type": "unity",
        "fromSite": "4399",
        "online": {
            "originPage": "http://www.4399.com/flash/125229.htm",
            "truePage": "http://sda.4399.com/4399swf/upload_swf/ftp12/weijianp/20131019/001/u3d_https.htm",
            "binUrl": "http://sda.4399.com/4399swf/upload_swf/ftp12/weijianp/20131019/001/web.unity3d",
            "icon": "http://imga5.5054399.com/upload_pic/2016/2/25/4399_11181214333.jpg"
        }
    },
    "https://www.4399.com/flash/18012.htm": {
        "title": "植物大战僵尸",
        "category": "策略",
        "type": "flash",
        "fromSite": "4399",
        "online": {
            "originPage": "http://www.4399.com/flash/18012.htm",
            "truePage": "https://s4.4399.com/4399swf/upload_swf/ftp/20090929/1/game1.htm",
            "binUrl": "https://s4.4399.com/4399swf/upload_swf/ftp/20090929/1/pvz_9_15.swf",
            "icon": "http://imga3.5054399.com/upload_pic/2016/2/18/4399_18432063237.jpg"
        }
    },
    "https://www.4399.com/flash/94107.htm":
        {
            "title": "愤怒的小鸟免费神鹰版",
            "category": "益智",
            "type": "flash",
            "fromSite": "4399",
            "online": {
                "originPage": "http://www.4399.com/flash/94107.htm",
                "truePage": "http://sxiao.4399.com/4399swf/upload_swf/ftp8/zhichang/20120723/001.swf",
                "binUrl": "http://sxiao.4399.com/4399swf/upload_swf/ftp8/zhichang/20120723/001.swf",
                "icon": "http://imga3.5054399.com/upload_pic/2012/7/23/4399_10113765770.jpg"
            }
        }
}
test("4399", async () => {
    //初始化模块
    com4399.initCookie("", () => {
    })
    //逐一测试用例
    for (const url in testMap) {
        const expected = testMap[url]
        expect((await com4399.entrance(url)).val).toEqual(expected)
    }
})