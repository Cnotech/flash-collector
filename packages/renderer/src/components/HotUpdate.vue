<template>
  <a-space direction="vertical">
    <a-alert
        v-if="latestVersion!==''"
        :message="forceUpdate?`当前版本的 Flash Collector 已不再受支持，请更新至最新版本 v${latestVersion}`:`Flash Collector v${latestVersion} 现已可用👌`"
        :type="forceUpdate?'error':'success'"
        closeText="立即更新"
        show-icon
        @click="update"
    >
      <template v-if="!forceUpdate" #icon>
        <rocket-outlined/>
      </template>
    </a-alert>
    <template v-for="n of notices">
      <a-alert
          :closeText="n.close_text"
          :description="n.description"
          :message="n.message"
          :type="n.level"
          show-icon
          @close="closeNotice(n)"
      />
    </template>

  </a-space>
</template>

<script lang="ts" setup>
import axios from "axios";
import {Notice, UpdateReply} from "../../../class";
import {createVNode, ref} from "vue"
import bridge from "../bridge";
import {RocketOutlined} from '@ant-design/icons-vue';
import {getConfig, setConfig} from "../config";
import {message} from "ant-design-vue";
import {shell} from "electron";
import {Result} from "ts-results";

const updateApi = "https://pineapple.edgeless.top/api/fc/hello"

let notices = ref<Notice[]>([]),
    latestVersion = ref(""),
    forceUpdate = ref(false)

let data: UpdateReply | null = null,
    updateMethod: "update" | "extendedUpdate" | "full" = "update"

async function init() {
  const currentVersion: string = await bridge('version')
  if (!(await bridge('isPackaged'))) {
    document.title = `Flash Collector Dev - 小游戏收集器 v${currentVersion}`
    return
  }
  //获取信息
  let res = await axios.get(updateApi)
  data = res.data as UpdateReply
  const config = await getConfig()

  //初始化标题
  let title = `Flash Collector - 小游戏收集器 v${currentVersion}`

  //检查更新
  if (versionCmp(currentVersion, data.latest.version) == "<") {
    latestVersion.value = data.latest.version
    //检查是否为强制更新
    if (versionCmp(currentVersion, data.update.force_update_until) == "<") {
      forceUpdate.value = true
      title += `（请立即更新至 v${data.latest.version} 版本）`
    } else {
      title += `（v${data.latest.version} 版本已可用）`
    }

    //判断更新策略
    //是否跨越鸿沟
    for (let gap of data.update.wide_gaps) {
      if (versionCmp(currentVersion, gap) == "<" && versionCmp(gap, data.latest.version) != "<") {
        updateMethod = "full"
        break
      }
    }
    //判断使用的更新包
    if (updateMethod != "full" && versionCmp(currentVersion, data.update.allow_normal_since) == "<") {
      updateMethod = "extendedUpdate"
    }
    console.log(updateMethod)
  }

  //设置标题
  document.title = title

  //筛选公告
  notices.value = data.notice
      .filter(n => !config.notice.ignore.includes(n.id))
      .filter(n => versionCmp(currentVersion, n.lower_than) == "<")
}

init()

type Cmp = ">" | "<" | "="

function versionCmp(a: string, b: string): Cmp {
  const x = a.split('.');
  const y = b.split('.');
  let result: Cmp = "=";

  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (Number(x[i]) < Number(y[i])) {
      result = "<";
      break;
    } else if (Number(x[i]) > Number(y[i])) {
      result = ">";
      break;
    }
  }

  // 处理前几位版本号相同但是位数不一致的情况，如1.3/1.3.0
  if (result === "=" && x.length !== y.length) {
    // 找出较长的那一个
    let t: Array<string>;
    t = x.length < y.length ? y : x;
    // 读取剩余位
    for (
        let i = Math.min(x.length, y.length);
        i < Math.max(x.length, y.length);
        i++
    ) {
      if (Number(t[i]) !== 0) {
        result = x.length < y.length ? "<" : ">";
        break;
      }
    }
  }

  return result;
}

async function closeNotice(n: Notice) {
  if (n.allow_ignore) {
    let config = await getConfig()
    config.notice.ignore.push(n.id)
    setConfig(config, true)
  }
}

async function update() {
  if (data == null) return
  latestVersion.value = ""

  if (updateMethod == "full") {
    await shell.openExternal(data.latest.page)
  } else {
    message.loading({
      content: "正在准备热更新...",
      key: "HotUpdate",
      duration: 0
    })
    let r = await bridge('update', updateMethod == "update" ? data.package.update : data.package.extended_update, data.latest.version) as Result<null, string>
    if (r.ok) {
      message.success({
        content: "热更新准备就绪，当您关闭程序时会执行热更新",
        key: "HotUpdate",
        duration: 5
      })
    } else {
      message.error({
        content: createVNode(`span`, {
          innerHTML: `热更新失败：${r.val}，您可以<a>前往官网</a>手动下载最新版`
        }),
        key: "HotUpdate",
        duration: 5,
        onClick() {
          if (data) shell.openExternal(data.latest.page)
        }
      })
    }
  }
}
</script>

<style scoped>

</style>
