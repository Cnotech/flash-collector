# Flash Collector （小游戏收集器）

集成 4399、 7k7k 等网站的小游戏一键下载、一键播放等功能，支持 Flash 和 Unity3D Web 小游戏的下载功能和 HTML5 小游戏的收藏功能

## 注意

解析与下载功能需要实名制登录对应的网站，请确保你已经成年

## 下载

访问 [Releases](https://github.com/Cnotech/flash-collector/releases) 页面

## 增加小游戏网站支持

定位到 `./packages/main/modules`，编写并在 `_register.ts` 中注册你的模块

## 调试

执行 `yarn dev`

## 编译

执行 `yarn build`，然后将 `retinue` 复制到编译后得到的 `win-unpacked` 文件夹内
