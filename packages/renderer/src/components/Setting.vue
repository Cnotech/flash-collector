<template>
  <a-page-header
      title="设置"
  />
  <a-card style="width: 100%" title="搜索方式">
    <a-space>
      <a-select v-model:value="site" :options="siteOptions" style="width: 120px"></a-select>
      <a-select v-model:value="method" :options="methodOptions" style="width: 140px"></a-select>
    </a-space>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="运行库检查">
    <a-switch v-model:checked="libCheck" checked-children="启用" un-checked-children="禁用"/>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="游戏服务端口">
    若无法在浏览器中访问本地游戏服务器请尝试修改端口，但是注意端口更改可能会导致丢失游戏进度！
    <br/>
    <a-space>
      <a-input v-model:value="port" style="width: 100%"/>
      <a-button @click="restart">应用</a-button>
    </a-space>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="安装 4399 源站播放脚本">
    由于 4399 为真实游戏页面增加了 Referer 限制，因此无法直接在浏览器中访问源站真实页面播放游戏，请按照以下步骤安装 4399 源站播放脚本：
    <br/>
    （1）在你的默认浏览器安装<a @click="shell.openExternal('https://www.tampermonkey.net/')">油猴（TamperMonkey）</a>或<a
      @click="shell.openExternal('https://violentmonkey.github.io/get-it/')">暴力猴（ViolentMonkey）</a>拓展；
    <br/>
    （2）访问<a
      @click="shell.openExternal('https://greasyfork.org/zh-CN/scripts/423836-4399%E6%B8%B8%E6%88%8F%E4%B8%8B%E8%BD%BD/code')">脚本发布页面</a>，安装脚本；
    <br/>
    （3）在 Flash Collector 中回到需要手动下载缺失文件的游戏页面，点击标题打开原始页面，点击“开始游戏”，然后点击上方的“下载”按钮进入源站真实页面；
    <br/>
    （4）按照剩余步骤手动下载缺失的文件。
  </a-card>
  <br/>
  <a-card style="width: 100%" title="许可与条款">
    此软件免费获取并在 <a @click="shell.openExternal('https://github.com/Cnotech/flash-collector')">Cnotech/flash-collector</a> 以
    MPL-2.0 协议开源，如果您拥有 GitHub 账号欢迎点个 Star 来表示鼓励；如果您是通过付费的方式获得的请立即申请退款并差评卖家。
    <br/><br/>
    使用此软件及其相关内容即表示您同意下述条款：
    <br/>
    （1）该仓库的代码以及编译后的可执行文件（包括本软件）仅供个人交流学习使用，作者不对以任何形式使用这些代码或可执行文件造成的后果负责；
    <br/>
    （2）禁止任何个人或组织将此软件及其相关内容用作商业用途，使用开源代码时必须严格遵守 MPL2.0 协议；
    <br/>
    （3）本软件及其仓库是 Flash Collector 字样及下图所示图标（渐变绿底FC字）的最早使用者，任何个人或组织未经授权不得使用相关字样或图标。
    <br/><br/>
    <img alt="Icon" src="../assets/favicon.ico" style="height: 50px;width: 50px;margin: 10px 0 0 50%"/>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="开发者工具">
    <a-button @click="devtool">DevTool</a-button>
  </a-card>
</template>

<script lang="ts" setup>
import type {SelectProps} from 'ant-design-vue';
import {message} from "ant-design-vue";
import {onMounted, onUnmounted, ref, watch} from "vue";
import bridge from "../bridge";
import {getConfig, setConfig} from "../config";
import {bus} from "../eventbus";
import {shell} from "electron";
import {router} from "../router";

const siteOptions = ref<SelectProps['options']>([
  {
    value: "4399",
    label: "4399.com"
  },
  {
    value: "7k7k",
    label: "7k7k.com"
  },
])
let methodOptions = ref([
  {
    value: "baidu",
    label: "百度高级搜索"
  },
  {
    value: "bing",
    label: "必应高级搜索"
  },
  {
    value: "google",
    label: "谷歌高级搜索"
  },
])
let site = ref<string>("4399"),
    method = ref<string>("baidu"),
    libCheck = ref<boolean>(true),
    port = ref<number>(3000)

function devtool() {
  bridge('devtool')
}

watch(site, (a, b) => {
  if (a != "4399" && b == "4399") {
    methodOptions.value.push({
      value: "origin",
      label: "原站搜索"
    })
  } else if (a == "4399" && b != "4399") {
    methodOptions.value.pop()
    if (method.value == "origin") method.value = "baidu"
  }
})

function validPort(): boolean {
  const p = port.value
  if (p < 1000 || p > 65535) {
    port.value = 3000
    message.error("请保持端口处于1000-65535")
    return false
  }
  return true
}

onMounted(async () => {
  const config = await getConfig()

  site.value = config.search.site
  method.value = config.search.method

  libCheck.value = config.libCheck

  port.value = config.port
})

const save = async () => {
  let config = await getConfig()

  config.search.site = site.value
  config.search.method = method.value

  config.libCheck = libCheck.value

  config.port = port.value

  setConfig(config)
  bus.emit('update-search-pattern')
}

onUnmounted(save)

router.beforeEach(() => {
  return validPort()
})

async function restart() {
  if (validPort()) {
    await save()
    bridge('restart')
  }
}

</script>

<style scoped>

</style>
