<template>
  <div style="width:100%; height:100%">
    <a-page-header
        :sub-title="info.category"
    >
      <template #title>
        <a @click="openExt(info.online.originPage)">{{ info.title }}</a>
      </template>
      <template #tags>
        <a-tag v-if="status" color="blue">运行中</a-tag>
        <a-tag v-else color="gray">未运行</a-tag>
      </template>
      <template #extra>
        <a-dropdown v-if="info.type==='flash'">
          <template #overlay>
            <a-menu>
              <a-menu-item key="1" @click="launch(true)">兼容模式</a-menu-item>
              <a-menu-item key="2" @click="openExt(info.online.truePage)">源站播放</a-menu-item>
            </a-menu>
          </template>
          <a-button :disabled="status" type="primary" @click="launch(false)">
            {{ status ? "正在运行" : "开始游戏" }}
            <DownOutlined/>
          </a-button>
        </a-dropdown>
        <a-button v-else type="primary" @click="launch(false)">{{ status ? "正在运行" : "开始游戏" }}</a-button>
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
import {ipcRenderer, shell} from "electron";
import {GameInfo} from "../../../class";
import {DownOutlined} from '@ant-design/icons-vue';
import {message} from "ant-design-vue";

const route = useRoute(), router = useRouter()

let playingList: string[] = []

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
  playingList = playingList.filter(val => val != payload.folder)
  if (payload.type == info.value.type && payload.folder == info.value.local?.folder) {
    status.value = false
  }
})

function launch(backup: boolean) {
  playingList.push(info.value.local?.folder as string)
  ipcRenderer.send('launch', {type: info.value.type, folder: info.value.local?.folder, backup})
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

function openExt(url: string) {
  shell.openExternal(url)
}

//配置查询
onMounted(async () => {
  info.value = await query()
})
router.afterEach(async () => {
  if (route.query.id == null) return
  info.value = await query()
  if (info.value.local && playingList.includes(info.value.local.folder)) {
    status.value = true
  } else {
    status.value = false
  }
})

</script>

<style scoped>

</style>
