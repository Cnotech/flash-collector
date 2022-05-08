<template>
  <div style="width:100%; height:100%">
    <a-page-header
        :sub-title="info.category"
    >
      <template #title>
        <a @click="openExt(info.online.originPage)">{{ info.title }}</a>
      </template>
      <template #tags>
        <a-tag color="blue">{{ info.fromSite }}</a-tag>
      </template>
      <template #extra>
        <template v-if="info.type==='flash'">
          <a-dropdown>
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
          <a-popover placement="rightBottom" title="无法在本地正确运行游戏？" trigger="hover">
            <template #content>
              <p>这个小游戏可能是多文件游戏，但是爬虫只能获取到入口.swf文件</p>
              <p>请按照以下步骤手动下载缺失的文件：</p>
              <p>1. 点击“源站播放”，按下F12并切换到“网络”选项卡，然后刷新页面</p>
              <p>2. 将网络请求中{{ info.local.binFile }}以外的其他.swf文件（也可能会有非.swf文件需要加载）下载到游戏存储目录
                （<a @click="openFolder">games/flash/{{ info.local.folder }}</a>），注意保持相对路径正确</p>
              <p>3. 打开兼容模式，按下F12并切换到“控制台”选项卡查看文件是否正确加载，如出现404检查对应文件是否正确放置</p>
            </template>
            <QuestionCircleOutlined/>
          </a-popover>
        </template>
        <template v-else-if="info.type=='h5'">
          <a-dropdown>
            <template #overlay>
              <a-menu>
                <a-menu-item key="2" @click="openExt(info.online.truePage)">源站播放</a-menu-item>
              </a-menu>
            </template>
            <a-button :disabled="status" type="primary" @click="launch(false)">
              {{ status ? "正在运行" : "开始游戏" }}
              <DownOutlined/>
            </a-button>
          </a-dropdown>
          <a-popover placement="rightBottom" title="这是一个在线游戏" trigger="hover">
            <template #content>
              <p>HTML5游戏暂时没有方法保存到本地，页面来自源游戏网站</p>
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制</p>
            </template>
            <QuestionCircleOutlined/>
          </a-popover>
        </template>
        <template v-else-if="info.type==='unity'">
          <a-dropdown>
            <template #overlay>
              <a-menu>
                <a-menu-item key="2" @click="openExt(info.online.truePage)">源站播放</a-menu-item>
              </a-menu>
            </template>
            <a-button :disabled="status" type="primary" @click="launch(false)">
              {{ status ? "正在运行" : "开始游戏" }}
              <DownOutlined/>
            </a-button>
          </a-dropdown>
          <a-popover placement="rightBottom" title="可能出现错误" trigger="hover">
            <template #content>
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制</p>
            </template>
            <QuestionCircleOutlined/>
          </a-popover>
        </template>
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
import {shell} from "electron";
import {GameInfo} from "../../../class";
import {DownOutlined, QuestionCircleOutlined} from '@ant-design/icons-vue';
import {message, Modal} from "ant-design-vue";
import cp from 'child_process'
import path from "path";
import bridge from "../bridge";
import {Result} from "ts-results";

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

//启动游戏
async function launch(backup: boolean) {
  playingList.push(info.value.local?.folder as string)
  status.value = true
  let res: Result<{ type: string, folder: string, backup: boolean }, string> = await bridge('launch', {
    type: info.value.type,
    folder: info.value.local?.folder,
    backup
  })
  if (res.ok) {
    const payload = res.val
    playingList = playingList.filter(val => val != payload.folder)
    if (payload.type == info.value.type && payload.folder == info.value.local?.folder) {
      status.value = false
    }
  } else {
    console.log(res.val)
    playingList = playingList.filter(val => val != info.value.local?.folder)
    status.value = false
    //说明需要安装运行库
    Modal.confirm({
      title: "运行库可能未安装",
      content: '您需要先正确安装运行库才能启动游戏，如果这是误报请在“设置”界面禁用运行库检查',
      okText: "安装",
      cancelText: "取消",
      onOk() {
        bridge('install', info.value.type).then(tip => message.success(tip))
      }
    })
  }
}

//查询信息
async function query(): Promise<GameInfo> {
  let s = (route.query.id as string).split(";")
  return bridge('query', {type: s[0], folder: s[1]})
}

function openExt(url: string) {
  shell.openExternal(url)
}

function openFolder() {
  cp.execSync(`explorer "${path.join(process.cwd(), "games", info.value.type, info.value.local?.folder as string)}"`)
}

//配置查询
onMounted(async () => {
  info.value = await query()
})
router.afterEach(async () => {
  if (route.query.id == null) return
  info.value = await query()
  status.value = !!(info.value.local && playingList.includes(info.value.local.folder));
})

</script>

<style scoped>

</style>
