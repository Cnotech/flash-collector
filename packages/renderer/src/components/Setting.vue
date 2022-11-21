<template>
  <a-page-header
      title="设置"
      @back="router.back()"
  />
  <a-card id="4399" title="配套用户脚本">
    由于 4399 等站点为真实游戏页面增加了 Referer 限制，因此无法直接在浏览器中访问源站真实页面播放游戏，请按照以下步骤安装配套用户脚本：
    <br/>
    （1）在浏览器中安装 <a @click="shell.openExternal('https://www.tampermonkey.net/')">油猴（TamperMonkey）</a>或 <a
      @click="shell.openExternal('https://violentmonkey.github.io/get-it/')">暴力猴（ViolentMonkey）</a>拓展；
    <br/>
    （2）访问 <a
      @click="shell.openExternal('https://greasyfork.org/zh-CN/scripts/444989-flash-collector-for-4399')">GreasyFork
    脚本页面</a> 或 <a
      @click="shell.openExternal('https://github.com/Cnotech/flash-collector/raw/master/user-script/flash-collector-script.user.js')">GitHub
    仓库脚本直链</a>，安装脚本。
  </a-card>
  <br/>
  <a-card title="启动浏览器">
    <a-space direction="vertical">
      <p>Flash Collector 在本地运行游戏可能需要浏览器的支持，请参考我们提供的<a
          @click="shell.openExternal('https://github.com/Cnotech/flash-collector#浏览器兼容性')">浏览器兼容性表格</a>选择游戏的启动浏览器</p>
      <a-space>
        <span style="margin-right: 12.5px">Flash：</span>
        <a-select v-model:value="browser.flash.name" :options="flashBrowserList" class="browser-selector"
                  @change="onChangeBrowser('flash')"></a-select>
        <span class="browser-location">{{ browser.flash.p }}</span>
      </a-space>
      <a-space>
        <span style="margin-right: 12px">Unity：</span>
        <a-select v-model:value="browser.unity.name" :options="unityBrowserList" class="browser-selector"
                  @change="onChangeBrowser('unity')"></a-select>
        <span class="browser-location">{{ browser.unity.p }}</span>
      </a-space>
      <a-space>
        <span>HTML5：</span>
        <a-select v-model:value="browser.h5.name" :options="h5BrowserList" class="browser-selector"
                  @change="onChangeBrowser('h5')"></a-select>
        <span class="browser-location">{{ browser.h5.p }}</span>
      </a-space>
    </a-space>
  </a-card>
  <br/>
  <a-card title="智能嗅探">
    <a-space direction="vertical">
      <p>此功能可以帮助下载异步加载的 Flash 小游戏，启用后当您使用“源站播放”时 Flash Collector
        会监听浏览器的资源请求并将请求的文件下载到本地</p>
      <p>需要浏览器支持 Chrome DevTools Protocol 才能进行嗅探，嗅探过程中浏览器可能会卡顿</p>
      <p>注意：嗅探过程中请尽可能游玩全部关卡以保证缺失的文件被嗅探全面；如果嗅探结束后仍不能在本地正确播放说明这个 Flash 可能在异步策略中增加了校验策略，建议还是在线玩</p>
      <a-switch v-model:checked="smartSniffing.enable" checked-children="启用" un-checked-children="关闭"
                @change="checkSmartSniffing"/>
      <a-space v-if="smartSniffing.enable" size="large">
        调试端口：
        <a-input v-model:value="smartSniffing.port" style="width: 140px"></a-input>
      </a-space>
      <template v-if="smartSniffing.enable&&browser.flash.node.trait.debug==='unknown'">
        启动参数：
        <a-input v-model:value="smartSniffing.arg"
                 :placeholder="`输入${browser.flash.name}不带端口号的 Chrome DevTools Protocol 启动参数，例如 --remote-debugging-port=`"></a-input>
        <a-button type="link"
                  @click="shell.openExternal('https://www.npmjs.com/package/chrome-remote-interface#Setup')">CDP参数参考
        </a-button>
      </template>
    </a-space>
  </a-card>
  <br/>
  <a-card title="自动备份进度">
    <p>在启动游戏时自动备份上次游戏进度，若频繁出错请<a @click="shell.openExternal('https://github.com/Cnotech/flash-collector/issues')">提交
      issue </a>然后暂时关闭此功能</p>
    <a-switch v-model:checked="enableProgressBackup" checked-children="启用" un-checked-children="禁用"/>
  </a-card>
  <br/>
  <a-card title="运行库检查">
    <p>在启动游戏时自动检查相应运行库是否已经安装，若有误报请关闭</p>
    <a-switch v-model:checked="libCheck" checked-children="启用" un-checked-children="禁用"/>
  </a-card>
  <br/>
  <a-card title="搜索引擎">
    <a-space>
      <a-select v-model:value="site" :options="siteOptions" style="width: 120px"></a-select>
      <a-select v-model:value="method" :options="methodOptions" style="width: 140px"></a-select>
    </a-space>
  </a-card>
  <br/>
  <a-card title="许可与条款">
    此软件免费获取并在 <a @click="shell.openExternal('https://github.com/Cnotech/flash-collector')">Cnotech/flash-collector</a> 以
    MPL-2.0 协议开源，如果您拥有 GitHub 账号欢迎点个 Star 来表示鼓励；如果您是通过付费的方式获得的请立即申请退款并差评卖家。
    <br/><br/>
    使用此软件及其相关内容即表示您同意下述条款：
    <br/>
    （1）该仓库的代码以及编译后的可执行文件（包括本软件）仅供个人交流学习使用，作者不对以任何形式使用这些代码或可执行文件造成的后果负责；
    <br/>
    （2）禁止任何个人或组织将此软件及其相关内容用作商业用途，使用开源代码时必须严格遵守 MPL-2.0 协议；
    <br/>
    （3）本软件及其仓库是 Flash Collector 字样及下图所示图标（渐变绿底FC字）的最早使用者，任何个人或组织未经授权不得使用相关字样或图标。
    <br/><br/>
    <img alt="Icon" src="../assets/favicon.ico" style="height: 50px;width: 50px;margin: 10px 0 0 50%"/>
  </a-card>
  <br/>
  <a-card title="游戏服务端口">
    若无法在浏览器中访问本地游戏服务器请尝试修改端口，但是注意端口更改可能会导致丢失游戏进度！
    <br/><br/>
    <a-space>
      <a-input v-model:value="port" style="width: 100%"/>
      <a-button :type="oldPort==port?'default':'primary'" @click="restart">立即应用</a-button>
    </a-space>
  </a-card>
  <br/>
  <a-card title="开发者工具">
    <a-button @click="devtool">DevTool</a-button>
  </a-card>
</template>

<script lang="ts" setup>
import type {SelectProps} from 'ant-design-vue';
import {message, Modal} from "ant-design-vue";
import {onMounted, onUnmounted, ref, watch} from "vue";
import bridge from "../bridge";
import {getConfig, setConfig} from "../config";
import {bus} from "../eventbus";
import {shell} from "electron";
import {useRoute, useRouter} from "vue-router";
import {Browser, Config} from "../../../class";
import {Option} from "ts-results";

const router = useRouter(),
    route = useRoute()

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

interface ExactBrowser {
  name: string,
  p: string,
  node: Browser
}

let site = ref<string>("4399"),
    method = ref<string>("baidu"),
    libCheck = ref<boolean>(true),
    port = ref<number>(3000),
    oldPort = ref(3000),
    browser = ref<{ flash: ExactBrowser, unity: ExactBrowser, h5: ExactBrowser }>({
      flash: {
        name: "默认浏览器",
        p: "",
        node: {
          name: "默认浏览器",
          allowedPaths: [],
          trait: {
            flash: true,
            unity: true,
            debug: "disable"
          }
        }
      },
      unity: {
        name: "默认浏览器",
        p: "",
        node: {
          name: "默认浏览器",
          allowedPaths: [],
          trait: {
            flash: true,
            unity: true,
            debug: "disable"
          }
        }
      },
      h5: {
        name: "默认浏览器",
        p: "",
        node: {
          name: "默认浏览器",
          allowedPaths: [],
          trait: {
            flash: false,
            unity: false,
            debug: "disable"
          }
        }
      }
    }),
    flashBrowserList = ref<{ label: string, value: string, node: Browser }[]>([]),
    unityBrowserList = ref<{ label: string, value: string, node: Browser }[]>([]),
    h5BrowserList = ref<{ label: string, value: string, node: Browser }[]>([]),
    smartSniffing = ref<Config['smartSniffing']>({
      enable: false,
      port: 9222,
      arg: "--remote-debugging-port="
    }),
    enableProgressBackup = ref(true)

let config: Config

function devtool() {
  bridge('devtool')
}

function getBrowserNode(name: string, list: { label: string, value: string, node: Browser }[]): Browser {
  let b: Browser = {
    name: "默认浏览器",
    allowedPaths: [],
    trait: {
      flash: true,
      unity: true,
      debug: "disable"
    }
  }
  for (let n of list) {
    if (n.value == name) {
      b = n.node
      break
    }
  }
  return b
}

async function onChangeBrowser(type: 'flash' | 'unity' | 'h5') {
  let name = "", q: Option<string>
  if (type == 'flash') {
    name = browser.value.flash.name
    if (name == "自定义浏览器") {
      q = await bridge('chooseBrowser') as Option<string>
    } else {
      q = await bridge('parseBrowserPath', name) as Option<string>
    }
    if (q.some) {
      browser.value.flash.p = q.val
    } else {
      browser.value.flash.name = "默认浏览器"
      browser.value.flash.p = ""
      smartSniffing.value.enable = false
      name = "默认浏览器"
    }
    browser.value.flash.node = getBrowserNode(name, flashBrowserList.value)
  } else if (type == 'unity') {
    name = browser.value.unity.name
    if (name == "自定义浏览器") {
      q = await bridge('chooseBrowser') as Option<string>
    } else {
      q = await bridge('parseBrowserPath', name) as Option<string>
    }
    if (q.some) {
      browser.value.unity.p = q.val
    } else {
      browser.value.unity.name = "默认浏览器"
      browser.value.unity.p = ""
      name = "默认浏览器"
    }
    browser.value.unity.node = getBrowserNode(name, unityBrowserList.value)
  } else {
    name = browser.value.h5.name
    if (name == "自定义浏览器") {
      q = await bridge('chooseBrowser') as Option<string>
    } else {
      q = await bridge('parseBrowserPath', name) as Option<string>
    }
    if (q.some) {
      browser.value.h5.p = q.val
    } else {
      browser.value.h5.name = "默认浏览器"
      browser.value.h5.p = ""
      name = "默认浏览器"
    }
    browser.value.h5.node = getBrowserNode(name, h5BrowserList.value)
  }
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

function validPort(): boolean {
  const p = port.value
  if (p < 1000 || p > 65535) {
    port.value = 3000
    message.error("请保持端口处于1000-65535")
    return false
  }
  return true
}

function checkSmartSniffing(): boolean {
  if (!smartSniffing.value.enable) return true
  //定义最终变量
  let arg
  //检查Flash浏览器
  const flashDebug = browser.value.flash.node.trait.debug
  //处理不可用
  if (flashDebug == "disable") {
    smartSniffing.value.enable = false
    Modal.error({
      title: browser.value.flash.name + "不可用于智能嗅探",
      content: "您当前选择的 Flash 启动浏览器没有实现 Chrome DevTools Protocol，请重新选择一个启动浏览器"
    })
    return false
  }
  //处理未知
  if (flashDebug == 'unknown') {
    arg = smartSniffing.value.arg
    if (arg.length < 3 || arg[arg.length - 1] != "=" || arg.match(/\s/)) {
      Modal.error({
        title: "自定义CDP参数格式不规范",
        content: `请输入${browser.value.flash.name}不带端口号的 Chrome DevTools Protocol 启动参数，例如 --remote-debugging-port=`
      })
      smartSniffing.value.arg = "--remote-debugging-port="
      return false
    }
  } else {
    arg = browser.value.flash.node.trait.debug
  }
  //处理端口范围
  let port = Number(smartSniffing.value.port)
  if (port < 1000 || port > 65535) {
    Modal.error({
      title: "端口范围错误",
      content: `请输入范围在1000-65535的端口，默认为9222`
    })
    smartSniffing.value.port = 9222
    return false
  }
  //写启动参数
  smartSniffing.value.arg = arg
  smartSniffing.value.port = port
  return true
}

onMounted(async () => {
  config = await getConfig()


  site.value = config.search.site
  method.value = config.search.method

  libCheck.value = config.libCheck

  port.value = config.port
  oldPort.value = config.port

  smartSniffing.value = config.smartSniffing
  enableProgressBackup.value = config.progressBackup.enable

  //获取本地可用浏览器列表
  let bList: Browser[] = [{
    name: "默认浏览器",
    allowedPaths: [],
    trait: {
      flash: true,
      unity: true,
      debug: 'disable'
    }
  }].concat(await bridge('getAvailableBrowsers'))
  bList.push({
    name: "自定义浏览器",
    allowedPaths: [],
    trait: {
      flash: true,
      unity: true,
      debug: 'unknown'
    }
  })
  flashBrowserList.value = bList
      .filter(n => {
        return n.trait.flash
      })
      .map(n => {
        return {
          label: n.name,
          value: n.name,
          node: n
        }
      })
  unityBrowserList.value = bList
      .filter(n => {
        return n.trait.unity
      })
      .map(n => {
        return {
          label: n.name,
          value: n.name,
          node: n
        }
      })
  h5BrowserList.value = bList
      .map(n => {
        return {
          label: n.name,
          value: n.name,
          node: n
        }
      })
  //配置当前浏览器
  const flashBN = await bridge('getBrowserNickName', config.browser.flash),
      unityBN = await bridge('getBrowserNickName', config.browser.unity),
      h5BN = await bridge('getBrowserNickName', config.browser.h5)
  browser.value = {
    flash: {
      name: flashBN,
      p: config.browser.flash,
      node: getBrowserNode(flashBN, flashBrowserList.value)
    },
    unity: {
      name: unityBN,
      p: config.browser.unity,
      node: getBrowserNode(unityBN, unityBrowserList.value)
    },
    h5: {
      name: h5BN,
      p: config.browser.h5,
      node: getBrowserNode(h5BN, h5BrowserList.value)
    }
  }
})

const save = async () => {
  let config = await getConfig()

  config.search.site = site.value
  config.search.method = method.value

  config.libCheck = libCheck.value

  config.port = Number(port.value)

  config.browser = {
    flash: browser.value.flash.p,
    unity: browser.value.unity.p,
    h5: browser.value.h5.p,
    ignoreAlert: config.browser.ignoreAlert
  }

  config.smartSniffing = JSON.parse(JSON.stringify(smartSniffing.value))
  config.progressBackup.enable = enableProgressBackup.value

  setConfig(config, true)
  bus.emit('update-search-pattern')
}

onUnmounted(save)

router.beforeEach(() => {
  //检查端口号
  if (!validPort()) {
    return false
  }
  //检查端口是否被修改
  if (route.path == '/setting' && oldPort.value != port.value) {
    Modal.confirm({
      title: "需要重启应用",
      content: "您更改了游戏服务端口，在访问其他页面之前需要重启应用",
      okText: "重启",
      cancelText: "取消",
      onOk() {
        restart()
      },
      onCancel() {
        port.value = oldPort.value
      }
    })
    return false
  }
  //检查智能嗅探参数是否有效
  if (smartSniffing.value.enable && !checkSmartSniffing()) {
    return false
  }
  //放行路由
  return true
})

async function restart() {
  if (validPort()) {
    await save()
    bridge('restart')
  }
}

</script>

<style scoped>
a-card {
  width: 100%;
}

.browser-selector {
  width: 160px;
}

.browser-location {
  color: gray;
}
</style>
