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
      <a-button>应用</a-button>
    </a-space>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="开发者工具">
    <a-button @click="devtool">DevTool</a-button>
  </a-card>
</template>

<script lang="ts" setup>
import type {SelectProps} from 'ant-design-vue';
import {ref} from "vue";
import bridge from "../bridge";

const siteOptions = ref<SelectProps['options']>([
      {
        value: "4399",
        label: "4399.com"
      },
      {
        value: "7k7k",
        label: "7k7k.com"
      },
    ]),
    methodOptions = ref<SelectProps['options']>([
      {
        value: "origin",
        label: "原站搜索"
      },
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
    method = ref<string>("origin"),
    libCheck = ref<boolean>(true),
    port = ref<number>(3000)

function devtool() {
  bridge('devtool')
}
</script>

<style scoped>

</style>
