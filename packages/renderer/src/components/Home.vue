<template>
  <div class="container">
    <HotUpdate/>
    <div class="flex-container" style="margin-top: 10%;margin-bottom: 5%">
      <img alt="Icon" src="../assets/favicon.ico" style="height: 64px;width: 64px"/>
    </div>
    <a-row type="flex">
      <a-col :span="2"/>
      <a-col :span="17">
        <a-input
            v-model:value="url"
            allowClear
            placeholder="搜索或粘贴小游戏网址"
            size="large"
            @change="parse"
            @pressEnter="download"
        >
          <template v-if="gameTitle!=null&&url!==''" #suffix>
            <p style="color: rgba(0,0,0,0.45);margin-bottom: 0">{{ gameTitle }}</p>
          </template>
        </a-input>
      </a-col>
      <a-col :span="1"/>
      <a-col :span="3">
        <a-button
            :loading="loading"
            size="large"
            type="primary"
            @click="download"
        >{{ buttonDisabled ? "搜索" : buttonText }}
        </a-button>
      </a-col>
    </a-row>

    <a-row v-show="localSearch.length>0" style="margin-top: 20px" type="flex">
      <a-col :span="2"/>
      <a-col :span="19">
        <strong>本地游戏库</strong>
        <br/>
        <a-list :data-source="localSearch" item-layout="horizontal">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta style="cursor: pointer"
                                @click="router.push(`/game?id=${item.type};${item.local?.folder}`)">
                <template #title>
                  {{ item.title }}
                </template>
                <template #avatar>
                  <a-avatar v-if="item.local?.icon"
                            :src="`http://localhost:${port}/games/${item.type}/${item.local?.folder}/${item.local?.icon}`"
                            shape="square"/>
                  <a-avatar v-else shape="square" style="background-color: #4bb117">{{ item.title.slice(0, 2) }}
                  </a-avatar>
                </template>
                <template #description>
                  <a-tag color="purple">{{ item.category }}</a-tag>
                  <a-tag color="cyan">{{ item.type }}</a-tag>
                  <a-tag color="green">{{ item.fromSite }}</a-tag>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-col>
    </a-row>

    <a-row v-show="recentLaunch.length>0" style="margin-top: 20px" type="flex">
      <a-col :span="2"/>
      <a-col :span="22">
        <strong>最近启动</strong>
        <br/>
        <a-space style="margin-top: 15px">
          <a-space v-for="item of recentLaunch" align="center" direction="vertical" style="margin: 10px;cursor: pointer"
                   @click="router.push(`/game?id=${item.info.type};${item.info.local?.folder}`)">
            <a-avatar v-if="item.info.local?.icon"
                      :src="`http://localhost:${port}/games/${item.info.type}/${item.info.local?.folder}/${item.info.local?.icon}`"
                      shape="square" size="large"/>
            <a-avatar v-else shape="square" size="large" style="background-color: #4bb117">
              {{ item.info.title.slice(0, 2) }}
            </a-avatar>

            <a-typography-text :content="item.info.title" :ellipsis="{tooltip:true}" style="max-width: 132px"/>
            <small style="color: gray">{{ item.freq }}次</small>
          </a-space>
        </a-space>
      </a-col>
    </a-row>

    <a-row style="margin-top: 20px" type="flex">
      <a-col :span="2"/>
      <a-col :span="20">
        <a-collapse v-model:activeKey="statusBarActiveKey" expandIconPosition="right" ghost
                    style="width: 100%;margin-left:-15px">
          <a-collapse-panel key="main">
            <template #header>
              <strong>登录状态（{{ cookieStatus.filter(n => n.login).length }}/{{ cookieStatus.length }}）</strong>
            </template>
            <div style="display: flex;justify-content: center;width: 100%">
              <table style="width: 50%;text-align: center">
                <template v-for="item of cookieStatus">
                  <tr style="height: 40px">
                    <td>{{ item.name }}</td>
                    <td>
                      <a-tag :color="item.login?'cyan':'gray'">
                        {{ item.login ? item.nickName : "未登录" }}
                      </a-tag>
                    </td>
                    <td>
                      <a-button v-if="item.login" size="small" @click="logout(item.name)">登出</a-button>
                      <a-button v-else size="small" type="primary" @click="login(item.name)">登录</a-button>
                    </td>
                  </tr>
                </template>
              </table>

            </div>
          </a-collapse-panel>
        </a-collapse>
      </a-col>
    </a-row>

  </div>
</template>

<script lang="ts" setup>
import {createVNode, onMounted, onUnmounted, ref} from 'vue';
import {clipboard, shell} from "electron";
import {Option, Result} from "ts-results";
import {Config, GameInfo, LoginStatus} from "../../../class";
import {message, Modal} from 'ant-design-vue';
import {bus} from "../eventbus";
import bridge from "../bridge";
import {getConfig} from "../config";
import {useRouter} from 'vue-router';
import {query} from "express";
import HotUpdate from "./HotUpdate.vue"

const router = useRouter()

let url = ref<string>(""),
    loading = ref<boolean>(false),
    buttonDisabled = ref<boolean>(true),
    buttonText = ref<string>("下载"),
    gameTitle = ref<string | null>(null),
    cookieStatus = ref<LoginStatus[]>([]),
    localSearch = ref<GameInfo[]>([]),
    port = ref(3000),
    recentLaunch = ref<{ info: GameInfo, freq: number }[]>([]),
    statusBarActiveKey = ref([])


let gameInfo: GameInfo | null = null,
    searchPattern: string = `https://www.baidu.com/s?wd=site%3A4399.com+%s`

getConfig().then(async (c) => {
  //配置端口
  port.value = c.port
  //配置最近启动
  let s, res: { info: GameInfo, freq: number }[] = [], count = 0, qRes
  for (let n of c.recentLaunch) {
    s = n.id.split(';')
    qRes = await bridge('query', {type: s[0], folder: s[1]}) as Option<GameInfo>
    if (!qRes.some) continue
    res.push({
      info: qRes.val,
      freq: n.freq
    })
    count++
    if (count == 5) break
  }
  recentLaunch.value = res
})

//初始化，获取cookie状态和配置
async function init() {
  let r: { config: Config, status: LoginStatus[] } = await bridge('init')
  cookieStatus.value = r.status
  genSearchPattern(r.config)
}

init()

//生成搜索模式
function genSearchPattern(config: Config) {
  const {site, method} = config.search
  if (method == 'origin') {
    switch (site) {
      case '4399':
        searchPattern = "http://so2.4399.com/search/search.php?k=%s"
        break
      case '7k7k':
        searchPattern = "http://so.7k7k.com/game/%s/"
        break
    }
  } else {
    //生成站点位置
    let s: string = "4399.com"
    switch (site) {
      case '4399':
        s = "4399.com"
        break
      case '7k7k':
        s = "7k7k.com"
        break
    }
    //根据搜索引擎生成搜索模式
    switch (method) {
      case 'baidu':
        searchPattern = `https://www.baidu.com/s?wd=site%3A${s}+%s`
        break
      case 'bing':
        searchPattern = `https://cn.bing.com/search?q=site%3A${s}+%s`
        break
      case 'google':
        searchPattern = `https://www.google.com/search?q=site%3A${s}+%s`
        break

    }
  }
  // console.log(searchPattern)
}

//登录与登出
async function logout(name: string) {
  for (let n of cookieStatus.value) {
    if (n.name == name) {
      n.login = false
      break
    }
  }
  await bridge('logout', name)
}

async function login(name: string) {
  let payload: { name: string, status: boolean, errorMessage: string, nickName: string } = await bridge('login', name)
  if (!payload.status) {
    message.error(payload.errorMessage)
    return
  }
  for (let n of cookieStatus.value) {
    if (n.name == payload.name) {
      n.login = payload.status
      n.nickName = payload.nickName
      break
    }
  }
}

//监听解析结果返回
const urlRegex = /https?:\/\/\S+/
let recentSubmit = 0

async function parse() {
  //判断url是否符合提交要求
  if (url.value == "" || !urlRegex.test(url.value)) {
    //配置交互
    buttonText.value = "搜索"
    buttonDisabled.value = true
    gameTitle.value = null
    //更新本地搜索
    if (url.value != "") {
      localSearch.value = await bridge('localSearch', url.value)
    } else {
      localSearch.value = []
    }
    return
  } else {
    buttonText.value = "下载"
    buttonDisabled.value = false
  }

  //防抖
  if (Date.now() - recentSubmit < 500) return
  recentSubmit = Date.now()

  //提交解析请求
  loading.value = true
  let result: Result<GameInfo, string> = await bridge('parse', url.value.split("#")[0])
  console.log(result)
  loading.value = false

  //处理返回结果
  if (result.ok) {
    gameInfo = result.val
    gameTitle.value = gameInfo.title
    if (result.val.hasOwnProperty('local')) {
      message.warn(`${result.val.title} 已下载，如果继续则会创建一个不共享进度的副本`)
      return
    }
    //处理html5类别
    if (result.val.type == 'h5') {
      Modal.confirm({
        title: "这似乎是一个HTML5游戏",
        content: "目前尚没有效果好的爬取HTML5游戏的开源解决方案，若继续则每次启动时需要联网在线游玩",
        okText: "继续",
        cancelText: "取消",
        onCancel() {
          gameInfo = null
          buttonText.value = "搜索"
          url.value = ""
        }
      })
    }
    //处理没有图标
    if (!result.val.online.icon) {
      let tip = "无法匹配图标"
      if (result.val.fromSite == "4399") {
        tip += "，因为游戏标题有敏感词被屏蔽"
      }
      message.warning(tip)
    }
  } else {
    message.error(result.val)
    //清空gameInfo
    gameInfo = null
    gameTitle.value = null
  }
}

async function download() {
  if (buttonDisabled.value) {
    //在线搜索
    if (url.value != "") await shell.openExternal(searchPattern.replace("%s", url.value))
  } else {
    //判断gameInfo是否就绪
    if (gameInfo == null) {
      await parse()
      if (gameInfo == null) return
    }
    //下载
    loading.value = true
    buttonText.value = "下载中"
    let payload: Result<GameInfo, string> = await bridge('download', gameInfo)
    buttonDisabled.value = false
    loading.value = false
    buttonText.value = "搜索"
    url.value = ""
    if (payload.ok) {
      const info = payload.val
      message.success(createVNode(`span`, {
        innerHTML: `${payload.val.title} 下载成功，<a>点击查看</a>`,
        onClick() {
          router.push(`/game?id=${info.type};${info.local?.folder}`)
        }
      }))
      bus.emit('refreshSidebar')
    } else {
      message.error(payload.val)
    }
  }
}

//页面入焦时检查剪切板
let recentClip = ""
const listener = () => {
      if (document.visibilityState === 'visible') {
        let text = clipboard.readText()
        if (recentClip != text) {
          if (urlRegex.test(text)) {
            recentClip = text
            url.value = text
            parse()
          }
        }
      }
    },
    updateSearchPattern = async () => {
      genSearchPattern(await getConfig())
    }
onMounted(async () => {
  document.addEventListener("visibilitychange", listener)

  bus.on('update-search-pattern', updateSearchPattern)
})
onUnmounted(() => {
  document.removeEventListener("visibilitychange", listener)
  bus.off('update-search-pattern', updateSearchPattern)
})
</script>

<style scoped>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-content: center;
}

.status-bar {
  margin-top: 5px;
  margin-bottom: 5px;
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
}

.flex-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: center;
  align-items: center;
}
</style>
