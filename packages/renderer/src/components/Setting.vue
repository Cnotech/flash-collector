<template>
  <a-page-header
      title="设置"
  />
  <a-card style="width: 100%" title="搜索方式">
    <a-space>
      <a-select v-model:value="site" :options="siteOptions" style="width: 120px"></a-select>
      <a-select v-model:value="method" :options="methodOptions" style="width: 120px"></a-select>
    </a-space>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="运行库检查">
    <a-switch v-model:checked="libCheck" checked-children="启用" un-checked-children="禁用"/>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="游戏服务端口">
    <a-space>
      <a-input v-model:value="port" style="width: 100%"/>
      <a-button @click="restart">应用</a-button>
    </a-space>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="开发者工具">
    <a-button @click="devtool">DevTool</a-button>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="许可与条款">
    此软件免费获取并在 <a @click="shell.openExternal('https://github.com/Cnotech/flash-collector')">Cnotech/flash-collector</a> 以
    MPL2.0 协议开源，如果您是通过付费的方式获得的请立即申请退款并差评卖家。如果您拥有 GitHub 账号欢迎点个 Star 来表示鼓励。
    <br/><br/>
    使用此软件及其相关内容即表示您同意下述条款：
    <br/>
    （1）该仓库的代码以及编译后的可执行文件（即本软件）仅供个人交流学习使用，作者不对以任何形式使用这些代码或可执行文件造成的后果负责；
    <br/>
    （2）禁止任何个人或组织将此软件及其相关内容用作商业用途，使用开源代码时必须严格遵守 MPL2.0 协议；
    <br/>
    （3）本软件及其仓库是 Flash Collector 字样及下图所示图标（渐变绿底FC字）的最早使用者，任何个人或组织不得未经授权使用相关字样或图标。
    <br/><br/>
    <img alt="Icon" src="../assets/favicon.ico" style="height: 50px;width: 50px;margin: 10px 0 0 50%"/>
  </a-card>
</template>

<script lang="ts" setup>
import type {SelectProps} from 'ant-design-vue';
import {onMounted, onUnmounted, ref, watch} from "vue";
import bridge from "../bridge";
import {getConfig, setConfig} from "../config";
import {bus} from "../eventbus";
import {shell} from "electron";

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

async function restart() {
  await save()
  bridge('restart')
}

</script>

<style scoped>

</style>
