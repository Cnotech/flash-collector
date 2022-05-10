<template>
  <div style="width:100%; height:100%">
    <a-page-header
        :sub-title="info.category"
    >
      <template #title>
        <template v-if="rename.status">
          <a-space>
            <a-input v-model:value="rename.value" @pressEnter="confirmRen"/>
            <a-button size="middle" type="primary" @click="confirmRen">完成</a-button>
          </a-space>
        </template>
        <a v-else @click="openExt(info.online.originPage)">{{ info.title }}</a>
      </template>
      <template #tags>
        <a-tag color="green">{{ info.fromSite }}</a-tag>
      </template>
      <template #extra>
        <a-dropdown>
          <template #overlay>
            <a-menu>
              <a-menu-item key="del" @click="del">删除</a-menu-item>
              <a-menu-item key="ins" @click="openFolder">查看目录</a-menu-item>
            </a-menu>
          </template>
          <a-button :disabled="status" @click="ren">
            重命名
            <DownOutlined/>
          </a-button>
        </a-dropdown>
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
              <p>1. 点击“源站播放”，按下F12并切换到“网络”选项卡，然后刷新页面；对于 4399 这一类有源站播放 Referer 限制的网页请<a @click="router.push('/setting')">前往“设置”界面</a>安装油猴脚本并从原始页面进入
              </p>
              <p>2. 将网络请求中{{ info?.local?.binFile }}以外的其他.swf文件（也可能会有非.swf文件需要加载）下载到
                （<a @click="openFolder">游戏存储目录</a>），注意保持相对路径正确</p>
              <p>3. 打开兼容模式，按下F12并切换到“控制台”选项卡查看文件是否正确加载，如出现404检查对应文件是否正确放置</p>
            </template>
            <QuestionCircleOutlined/>
          </a-popover>
        </template>
        <template v-else-if="info.type==='h5'">
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
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制；对于 4399 请<a @click="router.push('/setting')">前往“设置”界面</a>安装油猴脚本并从原始页面进入
              </p>
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
          <a-popover placement="rightBottom" title="关于源站播放" trigger="hover">
            <template #content>
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制；对于 4399 请<a @click="router.push('/setting')">前往“设置”界面</a>安装油猴脚本并从原始页面进入
              </p>
            </template>
            <QuestionCircleOutlined/>
          </a-popover>
        </template>
      </template>
    </a-page-header>

    <a-divider>下方为小游戏原始页面，仅供浏览</a-divider>

    <div
        id="webview-container"
        style="width:100%; height:80%;border-width: 0"
    />
  </div>
</template>

<script lang="ts" setup>
import {createVNode, onMounted, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {shell} from "electron";
import {GameInfo} from "../../../class";
import {DownOutlined, ExclamationCircleOutlined, QuestionCircleOutlined} from '@ant-design/icons-vue';
import {message, Modal} from "ant-design-vue";
import cp from 'child_process'
import path from "path";
import bridge from "../bridge";
import {Result} from "ts-results";
import fs from "fs";
import {bus} from "../eventbus";

const route = useRoute(), router = useRouter()
const banScript = fs.readFileSync("retinue/banScript.js").toString()

let playingList: string[] = [],
    webview: any

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
    }),
    rename = ref<{ status: boolean, value: string }>({status: false, value: ""})

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

//重命名与删除
function ren() {
  rename.value.value = info.value.title
  rename.value.status = true
}

async function confirmRen() {
  rename.value.status = false
  await bridge('rename', info.value.type, info.value.local?.folder)
  info.value.title = rename.value.value
  fs.writeFileSync(path.join(process.cwd(), "games", info.value.type, info.value.local?.folder as string, "info.json"), JSON.stringify(info.value, null, 2))
  bus.emit('refreshSidebar')
}

function del() {
  Modal.confirm({
    title: '是否将此游戏移动至回收站？',
    icon: createVNode(ExclamationCircleOutlined),
    content: '如果当前此文件正在被占用则可能删除失败，需要手动删除',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      const p = path.join(process.cwd(), "games", info.value.type, info.value.local?.folder as string)
      shell.trashItem(p)
          .then(() => {
            if (fs.existsSync(p)) {
              message.error("删除失败，请检查文件是否被占用然后手动删除")
            } else {
              message.success(info.value.title + " 已被移动至回收站")
              bus.emit('refreshSidebar')
              router.push("/")
            }
          })
          .catch(e => {
            console.log(e)
            message.error("删除失败，请检查文件是否被占用然后手动删除")
          })

    }
  })
}

//打开外部
function openExt(url: string) {
  shell.openExternal(url)
}

function openFolder() {
  try {
    cp.execSync(`explorer "${path.join(process.cwd(), "games", info.value.type, info.value.local?.folder as string)}"`)
  } catch (e) {
    //console.log(e)
  }
}

let recentExtURL = ""
onMounted(async () => {
  //配置查询
  info.value = await query()
  //动态添加webview
  webview = document.createElement("webview");
  webview.setAttribute('style', "height:100%")
  webview.setAttribute('src', info.value.online.originPage);
  (document.getElementById('webview-container') as HTMLElement).appendChild(webview);

  //监听webview加载完成事件，执行脚本
  webview.addEventListener('did-stop-loading', () => {
    webview.executeJavaScript(banScript)
  })
  //监听webview新窗口事件
  // webview.addEventListener('new-window', async (e:any) => {
  //   if((e.url as string).slice(0,4)=="http"){
  //     if(recentExtURL==e.url){
  //       message.success("已打开外部链接")
  //       recentExtURL=""
  //       await shell.openExternal(e.url)
  //     }else{
  //       message.info("双击以打开外部链接")
  //     }
  //   }
  // })
})

//配置更新查询
router.afterEach(async () => {
  if (route.query.id == null) return
  info.value = await query()
  status.value = !!(info.value.local && playingList.includes(info.value.local.folder));
  webview.setAttribute('src', info.value.online.originPage)
})

</script>

<style scoped>

</style>
