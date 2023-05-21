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
        <a v-else @click="shell.openExternal(info.online.originPage)">
          <a-typography-text :content="info.title" :ellipsis="{tooltip:true}" style="color: #4BB117"/>
        </a>
      </template>
      <template #tags>
        <a-tag color="green">{{ info.fromSite }}</a-tag>
        <a-tooltip :title="progressDisplayStatus.msg">
          <file-protect-outlined v-if="progressDisplayStatus.enable==='full'" class="progress-status-icon"
                                 style="color: #52c41a"/>
          <file-done-outlined v-if="progressDisplayStatus.enable==='partial'" class="progress-status-icon"
                              style="color: #52c41a"/>
          <exception-outlined v-if="progressDisplayStatus.enable==='disable'" class="progress-status-icon"/>
        </a-tooltip>

        <a-tooltip :title="backupDisplayTip">
          <check-circle-outlined v-if="backupDisplayStatus==='success'" class="progress-status-icon"
                                 style="color: #52c41a"/>
          <close-circle-outlined v-if="backupDisplayStatus==='error'" class="progress-status-icon"
                                 style="color: #e81e25"/>
          <sync-outlined v-if="backupDisplayStatus==='pending'" id="sync" class="progress-status-icon"
                         style="color: #1890FF"/>
        </a-tooltip>
      </template>
      <template #extra>
        <a-dropdown>
          <template #overlay>
            <a-menu>
              <a-menu-item key="del" @click="del">删除</a-menu-item>
              <a-menu-item key="ins" @click="openFolder">查看目录</a-menu-item>
              <a-menu-item key="ins" @click="backupProgress()">备份进度</a-menu-item>
              <a-menu-item key="ins" @click="restoreProgress">恢复进度</a-menu-item>
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
                  <radar-chart-outlined v-if="sniffingStatue" style="color: #42b983"/>
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
              <p v-if="!sniffingStatue">请<a @click="router.push('/setting')">前往“设置”界面</a>启用智能嗅探功能，然后点击本页面的“源站播放”嗅探缺失的文件
              </p>
              <p v-else>请点击“源站播放”并尽可能游玩全部关卡以嗅探缺失的文件</p>

              <br/>
              <p>关于源站播放</p>
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制，请<a
                  @click="router.push('/setting#4399')">前往“设置”界面</a>安装配套用户脚本
              </p>
            </template>

            <WarningFilled v-if="alertSwf" style="color: orange;font-size: larger"/>
            <QuestionCircleOutlined v-else/>
          </a-popover>
          <a-badge v-if="realTimeSniffing.display"
                   :count="realTimeSniffing.data.filter(node=>node.method==='downloaded').length"
                   @click="realTimeSniffing.drawerDisplay=true">
            <a-tooltip title="查看智能嗅探工作台">
              <radar-chart-outlined class="progress-status-icon" style="color: #42b983"/>
            </a-tooltip>
          </a-badge>
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
              <br/>
              <p>关于源站播放</p>
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制，请<a @click="router.push('/setting#4399')">前往“设置”界面</a>安装配套用户脚本
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
              <p>点击源站播放可能会显示错误，这是因为游戏网站增加了 Referer 限制，请<a @click="router.push('/setting#4399')">前往“设置”界面</a>安装配套用户脚本
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
    <a-drawer v-model:visible="realTimeSniffing.drawerDisplay" placement="bottom" title="智能嗅探工作台">
      <table style="width: 100%">
        <template v-for="item of realTimeSniffing.data">
          <tr>
            <td>
              <h4>{{ item.url }}</h4>
            </td>
            <td>
              <a-tag :color="RealTimeSniffingTag[item.method].color">
                {{ RealTimeSniffingTag[item.method].text }}
                <template #icon>
                  <check-circle-outlined v-if="item.method==='downloaded'"/>
                  <close-circle-outlined v-if="item.method==='error'"/>
                  <minus-circle-outlined v-if="item.method==='ignored'"/>
                  <clock-circle-outlined v-if="item.method==='cached'"/>
                </template>
              </a-tag>
            </td>
          </tr>
        </template>
      </table>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
import {createVNode, onMounted, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {Config, GameInfo, ProgressEnable} from "../../../class";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  ExceptionOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  MinusCircleOutlined,
  QuestionCircleOutlined,
  RadarChartOutlined,
  SyncOutlined,
  WarningFilled
} from '@ant-design/icons-vue';
import {message, Modal, notification} from "ant-design-vue";
import cp from 'child_process'
import path from "path";
import bridge from "../bridge";
import {Option, Result} from "ts-results";
import fs from "fs";
import {bus} from "../eventbus";
import {getConfig, setConfig} from "../config";
import {ipcRenderer, shell} from "electron"
import {banScript} from "../assets/banScript.json"

const route = useRoute(), router = useRouter()

type BackupStatus = 'none' | 'pending' | 'success' | 'error'
type SniffingMethod = "downloaded" | "cached" | "ignored" | "error"

interface RealTimeSniffingArgs {
  display: boolean,
  payload?: {
    url: string,
    method: SniffingMethod,
    info: GameInfo
  }
}

interface RealTimeSniffingRecord {
  url: string
  method: SniffingMethod
}

const RealTimeSniffingTag: Record<SniffingMethod, { color: string, text: string, icon: any }> = {
  error: {
    color: 'error',
    text: '错误',
    icon: CloseCircleOutlined
  },
  downloaded: {
    color: 'success',
    text: '成功',
    icon: CheckCircleOutlined
  },
  cached: {
    color: 'processing',
    text: '已缓存',
    icon: ClockCircleOutlined
  },
  ignored: {
    color: 'default',
    text: '忽略',
    icon: MinusCircleOutlined
  }
}

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
    port = ref(3000),
    sniffingStatue = ref(false),
    progressDisplayStatus = ref<{ enable: 'full' | 'partial' | 'disable', msg: string }>({
      enable: 'disable',
      msg: "进度备份功能无法启用"
    }),
    backupDisplayStatus = ref<BackupStatus>("none"),
    backupDisplayTip = ref(""),
    realTimeSniffing = ref<{
      display: boolean,
      data: RealTimeSniffingRecord[],
      drawerDisplay: boolean
    }>({
      display: false,
      data: [],
      drawerDisplay: false,
    })

let browser: Config['browser'] = {
  flash: "",
  unity: "",
  h5: "",
  ignoreAlert: false
}
refreshConfig()

//刷新配置
function refreshConfig() {
  getConfig().then(c => {
    port.value = c.port
    browser = c.browser
    sniffingStatue.value = c.smartSniffing.enable
  })
}

//启动游戏
async function launch(method: 'normal' | 'backup' | 'origin', force?: boolean): Promise<boolean> {
  //刷新同步状态
  await getProgressModuleStatus()

  //判断是否自动备份
  let backup = progressDisplayStatus.value.enable != "disable" && method == 'normal'

  //备份
  if (backup) {
    backupDisplayStatus.value = "pending"
    backupDisplayTip.value = "正在备份进度"
    let gameInfo = JSON.parse(JSON.stringify(info.value))
    let r = await bridge('backup', gameInfo, force) as Result<null, string>
    if (r.ok) {
      backupDisplayStatus.value = "success"
      backupDisplayTip.value = `进度备份成功（${(new Date()).toLocaleString()}）`
    } else {
      if (r.val.indexOf("OVERWRITE_CONFIRM:") == 0) {
        let createdBy = r.val.split(":")[1]
        let t = await bridge('getBackupTime', gameInfo)
        Modal.confirm({
          title: "未解决的备份冲突",
          content: `本地存在另一份由 ${createdBy} 创建于 ${t.val} 的进度，请选择保留一个`,
          okText: `${createdBy} 的进度`,
          cancelText: "本机进度",
          okButtonProps: {
            danger: true
          },
          onOk: () => {
            confirmRestoreProgress(true)
            launch(method, true)
          },
          onCancel: () => {
            launch(method, true)
          }
        })
        return false
      } else {
        backupDisplayStatus.value = "error"
        backupDisplayTip.value = r.val
      }
    }
  }

  //启动游戏
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
    return true
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
    return false
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
  launch(method).then(async (launchRes) => {
    //配置嗅探
    const config = await getConfig()
    if (info.value.type == 'flash' && method == 'origin' && config.smartSniffing.enable) {
      message.loading({
        content: "正在嗅探异步加载的 Flash 资源，嗅探过程中浏览器可能会卡顿，关闭浏览器以结束嗅探",
        key: "sniffing",
        duration: 0
      })
      let sniffingRes = await bridge('sniffing', info.value.online.truePage + '#flash-collector-0?title=' + info.value.title, JSON.parse(JSON.stringify(info.value))) as Result<string[], string>
      if (sniffingRes.err) {
        message.error({
          content: `资源嗅探失败：${sniffingRes.val}，使用任务管理器退出所有浏览器进程后重试，或查看“设置”页面的CDP启动参数是否配置正确`,
          key: "sniffing",
          duration: 3
        })
      } else {
        if (sniffingRes.val.length > 0) {
          message.success({
            content: `资源嗅探成功：嗅探到${sniffingRes.val.length}个新资源`,
            key: "sniffing",
            duration: 3
          })
          console.log(sniffingRes.val)
        } else {
          message.info({
            content: "没有嗅探到新的资源，玩的关卡越多嗅探的资源越全面哦",
            key: "sniffing",
            duration: 3
          })
        }
      }
      return
    }
    //配置兼容性提示
    let defaultAlert = false
    if (info.value.type == 'flash' && browser.flash == "") {
      defaultAlert = true
    } else if (info.value.type == 'unity' && browser.unity == "") {
      defaultAlert = true
    }
    if (!browser.ignoreAlert && defaultAlert && launchRes) {
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

async function getProgressModuleStatus() {
  //清除备份状态显示
  backupDisplayStatus.value = "none"
  backupDisplayTip.value = ""
  //获取进度模块状态
  let status = await bridge('initProgressModule') as ProgressEnable
  //读取配置总开关
  let config = await getConfig()
  if (!config.progressBackup.enable) {
    progressDisplayStatus.value.enable = 'disable'
    progressDisplayStatus.value.msg = "进度备份功能已关闭，请在“设置”页面中启用"
    return
  }
  //判断当前游戏的同步状态
  if (info.value.type == 'flash') {
    if (status.flashIndividual) {
      progressDisplayStatus.value.enable = 'full'
      progressDisplayStatus.value.msg = "进度备份功能已启用"
    } else {
      progressDisplayStatus.value.msg = "暂时无法启用进度备份功能，请点击“开始游戏”游玩一会后重试"
    }
  } else if (info.value.type == 'unity') {
    if (status.unity) {
      progressDisplayStatus.value.enable = 'full'
      progressDisplayStatus.value.msg = "进度备份功能已启用"
    } else {
      progressDisplayStatus.value.msg = "暂时无法启用进度备份功能，请点击“开始游戏”游玩一会后重试"
    }
  } else {
    progressDisplayStatus.value.enable = 'full'
    progressDisplayStatus.value.msg = "进度备份功能已启用"
  }
}

async function backupProgress(force?: boolean) {
  backupDisplayStatus.value = "pending"
  backupDisplayTip.value = "正在备份进度"
  message.loading({
    content: "正在备份游戏进度...",
    key: "backup",
    duration: 0
  })
  let gameInfo = JSON.parse(JSON.stringify(info.value))
  let r = await bridge('backup', gameInfo, force) as Result<null, string>
  if (r.ok) {
    backupDisplayStatus.value = "success"
    backupDisplayTip.value = `进度备份成功（${(new Date()).toLocaleString()}）`
    message.success({
      content: "备份游戏进度成功",
      key: "backup",
      duration: 3
    })
  } else {
    if (r.val.indexOf("OVERWRITE_CONFIRM:") == 0) {
      let createdBy = r.val.split(":")[1]
      let t = await bridge('getBackupTime', gameInfo)
      Modal.confirm({
        title: "未解决的备份冲突",
        content: `本地存在另一份由 ${createdBy} 创建于 ${t.val} 的进度，请选择保留一个`,
        okText: `${createdBy} 的进度`,
        cancelText: "本机进度",
        okButtonProps: {
          danger: true
        },
        onOk: () => {
          confirmRestoreProgress(true)
          backupProgress(true)
        },
        onCancel: () => {
          backupProgress(true)
        }
      })
      return
    }
    message.error({
      content: r.val,
      key: "backup",
      duration: 5
    })
    backupDisplayStatus.value = "error"
    backupDisplayTip.value = r.val
  }
}

async function restoreProgress() {
  let r = await bridge('getBackupTime', JSON.parse(JSON.stringify(info.value))) as Option<string>
  if (r.some) {
    Modal.confirm({
      title: "确认恢复进度",
      content: `即将使用保存于 ${r.val} 的备份覆盖当前游戏进度，您的最新进度将会丢失！`,
      okText: "覆盖",
      okButtonProps: {
        danger: true
      },
      onOk: () => confirmRestoreProgress(false),
      cancelText: "取消"
    })
  } else {
    message.info("当前没有备份")
  }
}

async function confirmRestoreProgress(force?: boolean) {
  message.loading({
    content: "正在恢复游戏进度...",
    key: "restore",
    duration: 0
  })
  let r = await bridge('restore', JSON.parse(JSON.stringify(info.value)), force) as Result<null, string>
  if (r.ok) {
    message.success({
      content: "恢复游戏进度成功！如果游戏中依然没有更新进度则可能触发了游戏的反作弊机制，此类游戏无法正常恢复进度",
      key: "restore",
      duration: 3
    })
  } else {
    //检查错误是否由来自他人创建的进度导致，显示覆盖提示
    if (r.val.indexOf("OVERWRITE_CONFIRM:") == 0) {
      let createdBy = r.val.split(":")[1]
      let t = await bridge('getBackupTime', JSON.parse(JSON.stringify(info.value)))
      Modal.confirm({
        title: "这是一个由他人创建的进度",
        content: `该进度由 ${createdBy} 创建于 ${t.val}，是否使用该进度覆盖您的当前进度？`,
        okText: "覆盖",
        okButtonProps: {
          danger: true
        },
        onOk: () => confirmRestoreProgress(true),
        cancelText: "取消",
        onCancel: () => {
          message.info({
            content: "没有操作",
            key: "restore",
            duration: 2
          })
        }
      })
    } else {
      message.error({
        content: r.val,
        key: "restore",
        duration: 5
      })
    }
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

  //监听实时嗅探事件
  ipcRenderer.on("realTimeSniffing", (e, args: RealTimeSniffingArgs) => {
    realTimeSniffing.value.display = args.display && args.payload?.info.title == info.value.title
    if (args.display && args.payload != undefined) {
      realTimeSniffing.value.data.push({
        url: args.payload.url,
        method: args.payload.method
      })
    } else {
      realTimeSniffing.value.drawerDisplay = false
      realTimeSniffing.value.data = []
    }
  })

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
    if (route.path == "/game") webview.executeJavaScript(banScript).catch(() => {
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

  //刷新同步状态
  await getProgressModuleStatus()
})

//阻止路由离开
router.beforeEach(() => {
  if (realTimeSniffing.value.display) {
    message.warn("请关闭浏览器结束智能嗅探，然后才能离开此页面！")
    return false
  }
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
  //刷新同步状态
  await getProgressModuleStatus()
  //刷新配置
  refreshConfig()
})

</script>

<style scoped>
.progress-status-icon {
  font-size: large;
  margin-left: 5px;
  transform: translateY(2px);
  cursor: pointer;
}
</style>
