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
</template>

<script lang="ts" setup>
import type {SelectProps} from 'ant-design-vue';
import {onMounted, onUnmounted, ref, watch} from "vue";
import bridge from "../bridge";
import {getConfig, setConfig} from "../config";
import {bus} from "../eventbus";

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
