<template>
  <div class="container">
    <a-row style="margin-top: 15%;margin-bottom: 5%" type="flex">
      <a-col :span="9"/>
      <a-col :span="10">
        <a-radio-group
            v-model:value="inputType"
            :bordered="false"
        >
          <a-radio-button :value="0">标准</a-radio-button>
          <a-radio-button :value="1">批量</a-radio-button>
          <a-radio-button :value="2">搜索</a-radio-button>
        </a-radio-group>
      </a-col>
    </a-row>
    <a-row type="flex">
      <a-col :span="2"/>
      <a-col :span="17">
        <a-input
            v-model:value="url"
            allowClear
            placeholder="粘贴小游戏网址"
            size="large"
            @input="parse"
        >
          <template v-if="gameTitle!=null&&url!==''" #suffix>
            <p style="color: rgba(0,0,0,0.45);margin-bottom: 0">{{ gameTitle }}</p>
          </template>
        </a-input>
      </a-col>
      <a-col :span="1"/>
      <a-col :span="3">
        <a-button
            :disabled="buttonDisabled"
            :loading="loading"
            size="large"
            type="primary"
            @click="download"
        >{{ buttonText }}
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
import {ref} from 'vue';
import {useRoute} from 'vue-router';
import {ipcRenderer} from "electron";
import {Result} from "ts-results";
import {GameInfo} from "../../../class";
import {message} from 'ant-design-vue';
import {CheckCircleOutlined, CloseCircleOutlined} from '@ant-design/icons-vue';
import {bus} from "../eventbus";

const route = useRoute()
let url = ref<string>(""),
    loading = ref<boolean>(false),
    buttonDisabled = ref<boolean>(true),
    inputType = ref<number>(0),
    buttonText = ref<string>("下载"),
    gameTitle = ref<string | null>(null),
    cookieStatus = ref<Array<{ name: string, login: boolean }>>([])
let gameInfo: GameInfo | null = null

//初始化
ipcRenderer.on('init-reply', (event, payload: Array<{ name: string, login: boolean }>) => {
  cookieStatus.value = payload
})
ipcRenderer.send('init')

//登录与登出
function logout(name: string) {
  ipcRenderer.send('logout', name)
  for (let n of cookieStatus.value) {
    if (n.name == name) {
      n.login = false
      break
    }
  }
}

ipcRenderer.on('login-reply', (event, payload: { name: string, status: boolean, errorMessage: string }) => {
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
})

function login(name: string) {
  ipcRenderer.send('login', name)
}

//监听解析结果返回
ipcRenderer.on('parse-reply', (event, result: Result<GameInfo, string>) => {
  console.log(result)
  if (result.ok) {
    buttonDisabled.value = false
    gameInfo = result.val
    gameTitle.value = gameInfo.title
  } else {
    message.error(result.val)
  }
  loading.value = false
})

const urlRegex = /https?:\/\/\S+\.html?/
let recentSubmit = 0

function parse() {
  //判断url是否符合提交要求
  if (url.value == "" || !urlRegex.test(url.value)) return

  //防抖
  if (Date.now() - recentSubmit < 1000) return

  //提交搜索请求
  recentSubmit = Date.now()
  loading.value = true
  ipcRenderer.send('parse', url.value)
}

//监听下载进度事件更新
ipcRenderer.on('download-progress', (event, payload: { gameInfo: GameInfo, percentage: number }) => {
  buttonText.value = payload.percentage + "%"
  console.log(payload)
})

ipcRenderer.on('download-reply', (event, payload: Result<GameInfo, string>) => {
  buttonDisabled.value = false
  buttonText.value = "下载"
  url.value = ""
  if (payload.ok) {
    message.success(`${payload.val.title} 下载成功`)
    //TODO:显示到最近下载，然后刷新侧边栏
    bus.emit('refreshSidebar')
  } else {
    message.error(payload.val)
  }
})

function download() {
  buttonDisabled.value = true
  buttonText.value = "0%"
  ipcRenderer.send('download', gameInfo)
}
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
