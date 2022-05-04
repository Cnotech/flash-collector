# Unity3D Web Player

此 Web 播放器修改自 7k7k.com 提供的 Unity3D 小游戏页面，并附带了一个忍者斩铁剑游戏（`game.unity3d`）。

## 玩游戏

克隆此仓库到本地，安装 [`Unity Web Player`](http://webplayer.unity3d.com/download_webplayer-3.x/UnityWebPlayer64.exe) （如果链接失效说明
Unity 官方可能已经停止对 Unity3D Web 的支持，可以尝试使用本仓库 `installer` 目录内的安装包），然后直接在浏览器中运行 `Player.html`即可开始玩游戏。注意首次使用需要联网。

## 加载自定义游戏文件

有两种方式可以加载自定义游戏文件：

1. 直接替换根目录中的 `game.unity3d` 文件。
2. 访问 `Player.html` 时追加参数 `?load=xxx.unity3d`，例如 `Player.html?load=newgame.unity3d`。支持使用相对路径和 URL
   绝对路径，例如 `Player.html?load=../lego.unity3d`
   ，`Player.html?load=http://flash.7k7k.com/cms/cms10/20130522/1531254229/dd/lego.unity3d`。当不提供 `load` 参数时游戏会默认加载根目录中的 `
   game.unity3d`。
