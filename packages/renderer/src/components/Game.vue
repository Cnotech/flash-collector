<template>
  <div style="width:100%; height:100%">
    <a-page-header
        :sub-title="info.category"
        :title="info.title"
    >

      <template #tags>
        <a-tag v-if="status" color="blue">运行中</a-tag>
        <a-tag v-else color="gray">未运行</a-tag>
      </template>
      <template #extra>
        <a-button :disabled="status" type="primary" @click="launch">{{ status ? "正在运行" : "开始游戏" }}</a-button>
      </template>
    </a-page-header>

    <a-divider>下方为小游戏原始页面，不可点击</a-divider>

    <iframe
        :src="info.online.originPage"
        style="width:100%; height:80%;border-width: 0"
    />
  </div>
</template>

<script lang="ts" setup>
import {ref, onMounted} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {ipcRenderer,} from "electron";
import {GameInfo} from "../../../class";
import {message} from "ant-design-vue";

const route = useRoute(), router = useRouter()

let status = ref<boolean>(false),
    info = ref<GameInfo>({
      title: "加载中...",
      category: "未知分类",
      type: "h5",
      fromSite: "未知",
      online: {
        originPage: "",
        truePage: "",
        binUrl: ""
      },
      local: {
        binFile: "",
        folder: ""
      }
    })

//监听游戏运行结束
ipcRenderer.on('launch-reply', (e, payload: { type: string, folder: string }) => {
  if (payload.type == info.value.type && payload.folder == info.value.local?.folder) {
    status.value = false
  }
})

function launch() {
  ipcRenderer.send('launch', {type: info.value.type, folder: info.value.local?.folder})
  status.value = true
}

async function query(): Promise<GameInfo> {
  let s = (route.query.id as string).split(";")
  ipcRenderer.send('query', {type: s[0], folder: s[1]})
  return new Promise((resolve) => {
    ipcRenderer.once('query-reply', (event, args) => {
      resolve(args)
    })
  })
}

//配置查询
onMounted(async () => {
  info.value = await query()
})
router.afterEach(async () => {
  if (route.query.id == null) return
  info.value = await query()
})

</script>

<style scoped>

</style>
