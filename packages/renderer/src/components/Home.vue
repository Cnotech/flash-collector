<template>
  <div id="container">
    <a-input-search
        v-model:value="url"
        :loading="loading"
        enter-button="解析"
        placeholder="输入小游戏网址"
        size="large"
        @search="parse"
    >
      <template #suffix>
        <close-circle-outlined v-show="url!==''" style="color: rgba(0,0,0,0.45)" @click="url=''"/>
      </template>
    </a-input-search>
    <a-descriptions v-if="displayInfo!=null" bordered title="游戏信息">
      <a-descriptions-item v-for="item of displayInfo" :label="item.title">{{ item.value }}</a-descriptions-item>
    </a-descriptions>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue';
import {useRoute} from 'vue-router';
import {ipcRenderer} from "electron";
import {Result} from "ts-results";
import {GameInfo} from "../../../class";
import {message} from 'ant-design-vue';
import {CloseCircleOutlined} from '@ant-design/icons-vue';

const route = useRoute()
let url = ref<string>(""), displayInfo = ref<Array<{ title: string, value: string }> | null>(null),
    loading = ref<boolean>(false)
let gameInfo: GameInfo | null = null

//监听解析结果返回
ipcRenderer.on('result', (event, result: Result<GameInfo, string>) => {
  console.log(result)
  if (result.ok) {
    gameInfo = result.val
    displayInfo.value = [
      {title: "名称", value: gameInfo.title},
      {title: "分类", value: gameInfo.category},
      {title: "类型", value: gameInfo.type},
      {title: "原网址", value: gameInfo.online.originPage},
      {title: "真实网址", value: gameInfo.online.truePage},
      {title: "游戏文件下载链接", value: gameInfo.online.binUrl},
    ]
  } else {
    message.error(result.val)
    displayInfo.value = null
  }
  loading.value = false
})

function parse() {
  loading.value = true
  ipcRenderer.send('parse', url.value)
}
</script>

<style scoped>
#container {
  display: flex;
  flex-direction: column;
}
</style>
