# Flash Collector （小游戏收集器）

小游戏收集器，一键下载、本地运行小游戏，并与你的同伴分享游戏文件

## 特性

* 一键解析下载 Flash 和 Unity3D Web 小游戏
* 一键收藏 HTML5 小游戏
* 支持站点登录
* 自动检测并安装依赖库
* 原生支持 4399 和 7k7k 两大站点
* 模块化设计，可拓展小游戏站点支持

## 注意

解析与下载功能需要实名制登录对应的网站，请确保你已经成年

## 下载

访问 [Releases](https://github.com/Cnotech/flash-collector/releases) 页面

## 分享

在 `games` 文件夹中将需要分享给他人的小游戏目录压缩并发送，接收方解压至自己的 `games` 目录然后重启客户端

## 反馈

如果遇到无法解析的 **Flash 或 Unity3D** 游戏请[新建 issue](https://github.com/Cnotech/flash-collector/issues)，**不接受 HTML5 或页游的反馈请求**

## 增加小游戏网站支持

定位到 `./packages/main/modules`，编写并在 `_register.ts` 中注册你的模块

## 调试

执行 `yarn dev`

## 编译

执行 `yarn build`，然后将 `retinue` 复制到编译后得到的 `win-unpacked` 文件夹内
