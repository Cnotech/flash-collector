<template>
  <div style="width:100%; height:100%">
    <a-page-header
        :sub-title="info.category"
    >
      <template #avatar>
        <a-avatar v-if="info.local?.icon"
                  :src="`http://localhost:${port}/games/${info.type}/${info.local?.folder}/${info.local?.icon}`"
                  shape="square" size="large"/>
        <a-avatar v-else shape="square" style="background-color: #4bb117">{{ info.title.slice(0, 2) }}</a-avatar>
      </template>
      <template #title>
        <template v-if="rename.status">
          <a-space>
            <a-input v-model:value="rename.value" @pressEnter="confirmRen"/>
            <a-button size="middle" type="primary" @click="confirmRen">完成</a-button>
          </a-space>
        </template>
        <a v-else @click="shell.openExternal(info.online.originPage)">{{ info.title }}</a>
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
                <a-menu-item key="1" @click="browserAlert('backup')">兼容模式</a-menu-item>
                <a-menu-item key="2" @click="browserAlert('origin')">
                  源站播放
                </a-menu-item>
              </a-menu>
            </template>
            <a-button :disabled="status" type="primary" @click="launch('normal')">
              {{ status ? "正在运行" : "开始游戏" }}
              <DownOutlined/>
            </a-button>
          </a-dropdown>
          <a-popover :title="alertSwf?'此游戏可能无法在本地正确运行！':'无法在本地正确运行游戏？'" placement="rightBottom" trigger="hover">
            <template #content>
              <p>这个小游戏可能是多文件游戏，但是爬虫只能获取到入口.swf文件</p>
              <p>请按照以下步骤手动下载缺失的文件：</p>
              <p>0. 确保你的默认浏览器支持 Flash 插件，如果不支持推荐使用360极速浏览器X；对于 4399 这一类有源站播放 Referer 限制的网页请先<a
                  @click="router.push('/setting')">前往“设置”界面</a>安装配套用户脚本</p>
              <p>1. 点击“源站播放”，按下 F12 并切换到“网络”选项卡，然后刷新页面并正常玩一会游戏（至少要通过在本地被卡住的位置）
              </p>
              <p>2. 将网络请求中 {{ info?.local?.binFile }} 以外的其他.swf文件（也可能会有非.swf文件需要加载）下载到
                <a @click="openFolder">游戏存储目录</a>，<b>注意保持相对路径正确</b></p>
              <p>3. 打开兼容模式，按下 F12 并切换到“控制台”选项卡查看文件是否正确加载，如出现 404 则检查对应文件是否正确放置</p>
              <p>如果按照此方法做了之后游戏还是无法在本地正确运行，那可能是此 Flash 的异步加载逻辑过于复杂，我也不清楚咋办，建议直接在线玩（确信）</p>
              <br/>
              <p>关于源站播放：</p>
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制；对于 4399 请<a @click="router.push('/setting#4399')">前往“设置”界面</a>安装配套用户脚本
              </p>
            </template>

            <WarningFilled v-if="alertSwf" style="color: orange;font-size: larger"/>
            <QuestionCircleOutlined v-else/>
          </a-popover>
        </template>
        <template v-else-if="info.type==='h5'">
          <a-dropdown>
            <template #overlay>
              <a-menu>
                <a-menu-item key="2" @click="launch('origin')">
                  源站播放
                </a-menu-item>
              </a-menu>
            </template>
            <a-button :disabled="status" type="primary" @click="launch('normal')">
              {{ status ? "正在运行" : "开始游戏" }}
              <DownOutlined/>
            </a-button>
          </a-dropdown>
          <a-popover placement="rightBottom" title="这是一个在线游戏" trigger="hover">
            <template #content>
              <p>HTML5游戏暂时没有方法保存到本地，页面来自源游戏网站</p>
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制；对于 4399 请<a @click="router.push('/setting#4399')">前往“设置”界面</a>安装配套用户脚本
              </p>
            </template>
            <QuestionCircleOutlined/>
          </a-popover>
        </template>
        <template v-else-if="info.type==='unity'">
          <a-dropdown>
            <template #overlay>
              <a-menu>
                <a-menu-item key="2" @click="unityAlert">
                  源站播放
                </a-menu-item>
              </a-menu>
            </template>
            <a-button :disabled="status" type="primary" @click="browserAlert('normal')">
              {{ status ? "正在运行" : "开始游戏" }}
              <DownOutlined/>
            </a-button>
          </a-dropdown>
          <a-popover placement="rightBottom" title="关于源站播放" trigger="hover">
            <template #content>
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制；对于 4399 请<a @click="router.push('/setting#4399')">前往“设置”界面</a>安装配套用户脚本
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
import {Config, GameInfo} from "../../../class";
import {DownOutlined, ExclamationCircleOutlined, QuestionCircleOutlined, WarningFilled} from '@ant-design/icons-vue';
import {message, Modal, notification} from "ant-design-vue";
import cp from 'child_process'
import path from "path";
import bridge from "../bridge";
import {Option, Result} from "ts-results";
import fs from "fs";
import {bus} from "../eventbus";
import {getConfig, setConfig} from "../config";
import {shell} from "electron"

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
    rename = ref<{ status: boolean, value: string }>({status: false, value: ""}),
    alertSwf = ref(false),
    port = ref(3000)

let browser: Config['browser'] = {
  flash: "",
  unity: "",
  ignoreAlert: false
}
getConfig().then(c => {
  port.value = c.port
  browser = c.browser
})

//启动游戏
async function launch(method: 'normal' | 'backup' | 'origin') {
  playingList.push(info.value.local?.folder as string)
  status.value = true
  let res: Result<{ type: string, folder: string, method: 'normal' | 'backup' | 'origin' }, string> = await bridge('launch',
      info.value.type,
      info.value.local?.folder,
      method
  )
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
        message.loading({
          content: `正在安装运行库...`,
          key: "bin",
          duration: 0
        })
        if (info.value.type == 'flash') {
          notification.info({
            message: "正在为您安装纯净版 Flash Player",
            description: "此版本与毒瘤版互不兼容，如果需要安装毒瘤版需要提前卸载纯净版"
          })
        }
        bridge('install', info.value.type).then(content => message.success({
          content,
          key: "bin",
          duration: 3
        }))
      }
    })
  }
}

//查询信息
async function query(): Promise<Option<GameInfo>> {
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
    content: '删除游戏后会丢失游戏进度，仅能从回收站找回原文件夹恢复（重新下载游戏无法恢复进度）',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      bridge('del', info.value.type, info.value.local?.folder)
          .then(suc => {
            if (!suc) {
              message.error("删除失败，请检查文件是否被占用然后手动删除")
            } else {
              message.success(info.value.title + " 已被移动至回收站")
              bus.emit('refreshSidebar')
              router.push("/")
            }
          })
    }
  })
}

function unityAlert() {
  Modal.warning({
    title: "Unity3D 源站播放异常警告",
    content: "由于源站点代码结构专为嵌入式页面适配，直接在源站播放 Unity3D 游戏可能会出现窗口点按漂移、无法关闭等问题，建议仅在本地启动；如果你仍然继续且遇到了此问题，请通过任务栏关闭浏览器窗口",
    okText: "继续",
    cancelText: "取消",
    onOk() {
      browserAlert('origin')
    },
    closable: true,
    maskClosable: true
  })
}

function browserAlert(method: 'normal' | 'backup' | 'origin') {
  launch(method).then(() => {
    let defaultAlert = false
    if (info.value.type == 'flash' && browser.flash == "") {
      defaultAlert = true
    } else if (info.value.type == 'unity' && browser.unity == "") {
      defaultAlert = true
    }
    if (!browser.ignoreAlert && defaultAlert) {
      Modal.confirm({
        title: "浏览器兼容性提示",
        content: "如果浏览器提示不支持插件，请前往设置页面配置启动浏览器",
        okText: "前往",
        cancelText: "不再提示",
        onOk() {
          router.push('/setting')
        },
        onCancel() {
          browser.ignoreAlert = true
          getConfig().then(config => {
            config.browser.ignoreAlert = true
            setConfig(config, true)
          })
        }
      })
    }
  })
}

function openFolder() {
  try {
    cp.execSync(`explorer "${path.join(process.cwd(), "games", info.value.type, info.value.local?.folder as string)}"`)
  } catch (e) {
    //console.log(e)
  }
}

onMounted(async () => {
  //配置查询
  const qRes = await query()
  if (!qRes.some) return
  info.value = qRes.val
  //判断是否需要显示swf警告
  if (info.value.type == 'flash') {
    alertSwf.value = await bridge('showFlashAlert', info.value.local?.folder, info.value.local?.binFile)
  }
  //动态添加webview
  let webviewQuery = document.getElementsByTagName("webview")
  if (webviewQuery.length > 0) {
    webview = webviewQuery[0]
  } else {
    webview = document.createElement("webview");
    webview.setAttribute('style', "height:100%")
    webview.setAttribute('src', info.value.online.originPage);
    (document.getElementById('webview-container') as HTMLElement).appendChild(webview);
  }

  //监听webview加载完成事件，执行脚本
  webview.addEventListener('did-stop-loading', () => {
    webview.executeJavaScript(banScript).catch(() => {
    })
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
  const qRes = await query()
  if (!qRes.some) return
  info.value = qRes.val
  status.value = !!(info.value.local && playingList.includes(info.value.local.folder));
  //判断是否需要显示swf警告
  if (info.value.type == 'flash') {
    alertSwf.value = await bridge('showFlashAlert', info.value.local?.folder, info.value.local?.binFile)
  }
  //配置webview
  webview.setAttribute('src', info.value.online.originPage)
})

</script>

<style scoped>

</style>
