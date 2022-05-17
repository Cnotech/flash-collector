<template>
  <a-page-header
      title="设置"
      @back="router.back()"
  />
  <a-card style="width: 100%" title="搜索方式">
    <a-space>
      <a-select v-model:value="site" :options="siteOptions" style="width: 120px"></a-select>
      <a-select v-model:value="method" :options="methodOptions" style="width: 140px"></a-select>
    </a-space>
  </a-card>
  <br/>
  <a-card id="4399" style="width: 100%" title="安装配套用户脚本">
    由于 4399 为真实游戏页面增加了 Referer 限制，因此无法直接在浏览器中访问源站真实页面播放游戏，请按照以下步骤安装配套用户脚本：
    （1）在你的默认浏览器安装 <a @click="shell.openExternal('https://www.tampermonkey.net/')">油猴（TamperMonkey）</a>或 <a
      @click="shell.openExternal('https://violentmonkey.github.io/get-it/')">暴力猴（ViolentMonkey）</a>拓展；
    <br/>
    （2）访问 <a
      @click="shell.openExternal('https://greasyfork.org/zh-CN/scripts/444989-flash-collector-for-4399')">GreasyFork
    脚本页面</a> 或 <a
      @click="shell.openExternal('https://github.com/Cnotech/flash-collector/raw/master/userscript/flash-collector-script.user.js')">GitHub
    仓库脚本直链</a>，安装脚本。
  </a-card>
  <br/>
  <a-card style="width: 100%" title="启动浏览器">
    <a-space direction="vertical">
      <p>Flash Collector 在本地运行游戏可能需要浏览器的支持，请参考我们提供的<a
          @click="shell.openExternal('https://github.com/Cnotech/flash-collector#浏览器兼容性')">浏览器兼容性表格</a>选择游戏的启动浏览器</p>
      <a-space>
        Flash：
        <a-select v-model:value="browser.flash.name" :options="browserList" style="width: 140px"
                  @change="onChangeBrowser('flash')"></a-select>
        <span>{{ browser.flash.p }}</span>
      </a-space>
      <a-space>
        Unity：
        <a-select v-model:value="browser.unity.name" :options="browserList" style="width: 140px"
                  @change="onChangeBrowser('unity')"></a-select>
        <span>{{ browser.unity.p }}</span>
      </a-space>
    </a-space>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="运行库检查">
    <a-switch v-model:checked="libCheck" checked-children="启用" un-checked-children="禁用"/>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="游戏服务端口">
    若无法在浏览器中访问本地游戏服务器请尝试修改端口，但是注意端口更改可能会导致丢失游戏进度！
    <br/><br/>
    <a-space>
      <a-input v-model:value="port" style="width: 100%"/>
      <a-button :type="oldPort===port?'default':'primary'" @click="restart">立即应用</a-button>
    </a-space>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="许可与条款">
    此软件免费获取并在 <a @click="shell.openExternal('https://github.com/Cnotech/flash-collector')">Cnotech/flash-collector</a> 以
    MPL-2.0 协议开源，如果您拥有 GitHub 账号欢迎点个 Star 来表示鼓励；如果您是通过付费的方式获得的请立即申请退款并差评卖家。
    <br/><br/>
    使用此软件及其相关内容即表示您同意下述条款：
    <br/>
    （1）该仓库的代码以及编译后的可执行文件（包括本软件）仅供个人交流学习使用，作者不对以任何形式使用这些代码或可执行文件造成的后果负责；
    <br/>
    （2）禁止任何个人或组织将此软件及其相关内容用作商业用途，使用开源代码时必须严格遵守 MPL2.0 协议；
    <br/>
    （3）本软件及其仓库是 Flash Collector 字样及下图所示图标（渐变绿底FC字）的最早使用者，任何个人或组织未经授权不得使用相关字样或图标。
    <br/><br/>
    <img alt="Icon" src="../assets/favicon.ico" style="height: 50px;width: 50px;margin: 10px 0 0 50%"/>
  </a-card>
  <br/>
  <a-card style="width: 100%" title="开发者工具">
    <a-button @click="devtool">DevTool</a-button>
  </a-card>
</template>

<script lang="ts" setup>
import type {SelectProps} from 'ant-design-vue';
import {message} from "ant-design-vue";
import {onMounted, onUnmounted, ref, watch} from "vue";
import bridge from "../bridge";
import {getConfig, setConfig} from "../config";
import {bus} from "../eventbus";
import {shell} from "electron";
import {useRoute, useRouter} from "vue-router";
import {Browser} from "../../../class";
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
  p: string
}

let site = ref<string>("4399"),
    method = ref<string>("baidu"),
    libCheck = ref<boolean>(true),
    port = ref<number>(3000),
    oldPort = ref(3000),
    browser = ref<{ flash: ExactBrowser, unity: ExactBrowser }>({
      flash: {
        name: "默认浏览器",
        p: ""
      },
      unity: {
        name: "默认浏览器",
        p: ""
      }
    }),
    browserList = ref<{ label: string, value: string }[]>([])

function devtool() {
  bridge('devtool')
}

async function onChangeBrowser(type: 'flash' | 'unity') {
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
    }
  } else {
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
    }
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

onMounted(async () => {
  const config = await getConfig()

  site.value = config.search.site
  method.value = config.search.method

  libCheck.value = config.libCheck

  port.value = config.port
  oldPort.value = config.port

  browser.value = {
    flash: {
      name: await bridge('getBrowserNickName', config.browser.flash),
      p: config.browser.flash
    },
    unity: {
      name: await bridge('getBrowserNickName', config.browser.unity),
      p: config.browser.unity
    }
  }

  //获取本地可用浏览器列表
  let bList: Browser[] = [{
    name: "默认浏览器",
    allowedPaths: []
  }].concat(await bridge('getAvailableBrowsers'))
  bList.push({
    name: "自定义浏览器",
    allowedPaths: []
  })
  browserList.value = bList.map(n => {
    return {
      label: n.name,
      value: n.name
    }
  })
})

const save = async () => {
  let config = await getConfig()

  config.search.site = site.value
  config.search.method = method.value

  config.libCheck = libCheck.value

  config.port = port.value

  config.browser = {
    flash: browser.value.flash.p,
    unity: browser.value.unity.p
  }

  setConfig(config, true)
  bus.emit('update-search-pattern')
}

onUnmounted(save)

router.beforeEach(() => {
  if(route.path=='/setting'&&oldPort.value!=port.value){
    message.info("更改的游戏服务端口将会在应用重启后生效")
  }
  return validPort()
})

async function restart() {
  if (validPort()) {
    await save()
    bridge('restart')
  }
}

</script>

<style scoped>

</style>
