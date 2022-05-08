<template>
  <div class="container">
    <img alt="Icon" src="../assets/favicon.ico" style="height: 64px;width: 64px;margin: 10% 55% 5% 45%"/>
    <a-row type="flex">
      <a-col :span="2"/>
      <a-col :span="17">
        <a-input
            v-model:value="url"
            allowClear
            placeholder="搜索或粘贴小游戏网址"
            size="large"
            @input="parse"
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

    <a-row style="height: 20%;padding-top: 10%">
      <a-col :span="10"/>
      <a-col :span="4">
        <a-space v-for="item of cookieStatus" class="status-bar" size="middle">
          {{ item.name }}
          <template v-if="item.login">
            <check-circle-outlined style="color: #42b983"/>
            <a-button size="small" @click="logout(item.name)">登出</a-button>
          </template>
          <template v-else>
            <close-circle-outlined style="color: gray"/>
            <a-button size="small" @click="login(item.name)">登录</a-button>
          </template>
        </a-space>
      </a-col>
    </a-row>

  </div>
</template>

<script lang="ts" setup>
import {onUnmounted, ref} from 'vue';
import {ipcRenderer, shell} from "electron";
import {Result} from "ts-results";
import {GameInfo} from "../../../class";
import {message, Modal} from 'ant-design-vue';
import {CheckCircleOutlined, CloseCircleOutlined} from '@ant-design/icons-vue';
import {bus} from "../eventbus";
import bridge from "../bridge";

let url = ref<string>(""),
    loading = ref<boolean>(false),
    buttonDisabled = ref<boolean>(true),
    buttonText = ref<string>("下载"),
    gameTitle = ref<string | null>(null),
    cookieStatus = ref<Array<{ name: string, login: boolean }>>([])
let gameInfo: GameInfo | null = null

//异步初始化cookie状态
bridge('init').then((payload: Array<{ name: string, login: boolean }>) => {
  cookieStatus.value = payload
})

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
  let payload: { name: string, status: boolean, errorMessage: string } = await bridge('login', name)
  if (!payload.status) {
    message.error(payload.errorMessage)
    return
  }
  for (let n of cookieStatus.value) {
    if (n.name == payload.name) {
      n.login = payload.status
      break
    }
  }
}

//监听解析结果返回
const urlRegex = /https?:\/\/\S+\.html?/
let recentSubmit = 0

async function parse() {
  //判断url是否符合提交要求
  if (url.value == "" || !urlRegex.test(url.value)) {
    buttonText.value = "搜索"
    buttonDisabled.value = true
    gameTitle.value = null
    return
  } else {
    buttonText.value = "下载"
    buttonDisabled.value = false
  }

  //防抖
  if (Date.now() - recentSubmit < 500) return

  //提交搜索请求
  recentSubmit = Date.now()
  loading.value = true
  let result: Result<GameInfo, string> = await bridge('parse', url.value.split("#")[0])
  console.log(result)

  //处理返回结果
  if (result.ok) {
    loading.value = false
    gameInfo = result.val
    gameTitle.value = gameInfo.title
    if (result.val.hasOwnProperty('local')) {
      message.warn(`${result.val.title} 已下载，如果继续则会创建一个副本`)
      return
    }
    //处理html5类别
    if (result.val.type == 'h5') {
      Modal.confirm({
        title: "这似乎是一个HTML5游戏",
        content: "目前尚没有效果好的爬取HTML5游戏的开源解决方案，因此若继续则只会保存解析到的真实游戏页面而不会下载",
        okText: "继续",
        cancelText: "取消",
        onCancel() {
          gameInfo = null
          buttonText.value = "搜索"
          url.value = ""
        }
      })
    }
  } else {
    message.error(result.val)
  }
  loading.value = false
}

//监听下载进度事件更新
ipcRenderer.on('download-progress', (event, payload: { gameInfo: GameInfo, percentage: number }) => {
  buttonText.value = payload.percentage + "%"
  console.log(payload)
})

ipcRenderer.on('download-reply', (event, payload: Result<GameInfo, string>) => {
  buttonDisabled.value = false
  loading.value = false
  buttonText.value = "搜索"
  url.value = ""
  if (payload.ok) {
    message.success(`${payload.val.title} 下载成功`)
    //TODO:显示到最近下载
    bus.emit('refreshSidebar')
  } else {
    message.error(payload.val)
  }
})

function download() {
  if (buttonDisabled.value) {
    shell.openExternal(`https://www.baidu.com/s?wd=site%3A4399.com+${url.value}&ie=UTF-8`)
  } else {
    loading.value = true
    buttonText.value = "下载中"
    ipcRenderer.send('download', gameInfo)
  }
}

//离开页面前注销所有监听器
onUnmounted(() => {
  const channels = ['download-reply', 'download-progress', 'parse-reply', 'login-reply', 'init-reply']
  channels.forEach(channel => ipcRenderer.removeAllListeners(channel))
})
</script>

<style scoped>
.logo-big {
  width: 15vw;
  height: 15vw;
}

.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-content: center;
}

.status-bar {
  margin-top: 5%;
  margin-bottom: 5%;
}
</style>
