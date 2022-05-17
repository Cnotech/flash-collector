<template>
  <a-page-header
      title="港口"
  >
    <a-alert
        description="你可以在这里导入或导出你的游戏库用于备份或是分享，请注意港口无法保存或恢复你的游戏进度"
        message="欢迎来到港口"
        show-icon
        type="info"
    />
    <template #extra>
      <a-space v-if="state==='None'">
        <a-button :disabled="loading" @click="initImportList">导入</a-button>
        <a-button :disabled="loading" @click="initExportList">导出</a-button>
      </a-space>
      <a-space v-else-if="state==='Import'">
        <a-button :disabled="loading" @click="changeState('None')">取消</a-button>
        <a-button :disabled="selected.length===0" :loading="loading" type="primary" @click="confirm">导入{{ selected.length }}个游戏</a-button>
      </a-space>
      <a-space v-else-if="state==='Export'">
        <a-button :disabled="loading" @click="changeState('None')">取消</a-button>
        <a-button :disabled="selected.length===0" :loading="loading" type="primary" @click="confirm">导出{{ selected.length }}个游戏</a-button>
      </a-space>
    </template>
  </a-page-header>

  <template v-if="state!=='None'">
    <a-space style="margin-left: 4%">
      <strong style="margin-right: 20px">请选择需要{{ state === 'Import' ? '导入' : '导出' }}的游戏</strong>
      <span>排序：</span>
      <a-select v-model:value="sortBy" size="small" @change="sortList">
        <a-select-option value="Name">名称</a-select-option>
        <a-select-option value="Type">类型</a-select-option>
        <a-select-option value="Cate">分类</a-select-option>
        <a-select-option value="Site">来源</a-select-option>
      </a-select>
      <div>
        <a-button type="link" @click="selectHelper('All')">全选</a-button>
        <a-button type="link" v-if="state==='Import'" @click="selectHelper('Safe')">安全</a-button>
        <a-button type="link" @click="selectHelper('None')">不选</a-button>
      </div>
    </a-space>
    <a-row style="margin-right: 5%;height: 65%;overflow: auto" type="flex">
      <a-col :span="1"/>
      <a-col :span="22">
        <a-checkbox-group v-model:value="selected" style="width: 100%">
          <a-list :data-source="selectList" item-layout="horizontal">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>
                    {{ item.info.title }}
                  </template>
                  <template #avatar>
                    <a-avatar v-if="item.info.local?.icon"
                              :src="`http://localhost:${port}/${state==='Import'?'temp':'games'}/${item.info.type}/${item.info.local?.folder}/${item.info.local?.icon}`"
                              shape="square"/>
                    <a-avatar v-else shape="square" style="background-color: #4bb117">{{ item.info.title.slice(0, 2) }}
                    </a-avatar>
                  </template>
                  <template #description>
                    <a-tag color="purple" style="cursor: default"
                           @click="selectHelper('Closure',n=>n.info.category===item.info.category)">
                      {{ item.info.category }}
                    </a-tag>
                    <a-tag color="cyan" style="cursor: default"
                           @click="selectHelper('Closure',n=>n.info.type===item.info.type)">{{ item.info.type }}
                    </a-tag>
                    <a-tag color="green" style="cursor: default"
                           @click="selectHelper('Closure',n=>n.info.fromSite===item.info.fromSite)">
                      {{ item.info.fromSite }}
                    </a-tag>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <a-tooltip v-if="item.overwriteAlert" title="本地游戏库已存在此游戏，如果继续将会覆盖">
                    <WarningFilled style="color: orange;font-size: larger"/>
                  </a-tooltip>
                  <a-checkbox :value="item.info"></a-checkbox>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-checkbox-group>
      </a-col>
    </a-row>
  </template>
</template>

<script lang="ts" setup>
import {createVNode, ref} from "vue";
import {getConfig} from "../config";
import {GameInfo, List} from "../../../class";
import bridge from "../bridge";
import {Result} from "ts-results";
import {message} from "ant-design-vue";
import {WarningFilled} from '@ant-design/icons-vue';
import {bus} from "../eventbus";

type State = 'None' | 'Import' | 'Export'
type SortBy = 'Name' | 'Type' | 'Site' | 'Cate'

let port = ref(3000),
    selectList = ref<{ info: GameInfo, overwriteAlert: boolean }[]>([]),
    selected = ref<GameInfo[]>([]),
    state = ref<State>('None'),
    sortBy = ref<SortBy>('Name'),
    loading=ref(false)

getConfig().then(c => port.value = c.port)

async function initImportList() {
  message.loading({content: '正在处理中...', key: "initImport", duration: 0})
  loading.value=true
  //等待选择文件
  let res: Result<{ info: GameInfo, overwriteAlert: boolean }[], string> = await bridge('initImportPackage')
  loading.value=false

  if (res.err) {
    message.error({content: res.val, key: "initImport", duration: 3})
  } else {
    message.info({content: '请选择需要导入的游戏', key: "initImport", duration: 3})
    //填充待选列表
    selectList.value = res.val
    //生成已选列表
    let preSelect: GameInfo[] = []
    for (let n of res.val) {
      if (!n.overwriteAlert) preSelect.push(n.info)
    }
    selected.value = preSelect
    //更新DOM
    changeState('Import')
  }
}

async function initExportList() {
  selected.value = []
  let r: List = await bridge('refresh')
  let res: GameInfo[] = []
  for (let type in r) {
    res = res.concat(r[type])
  }
  selectList.value = res.map(info => {
    {
      return {
        info,
        overwriteAlert: false
      }
    }
  })
  changeState('Export')
}

function changeState(s: State) {
  state.value = s
}

async function confirm() {
  message.loading({content: '正在处理中...', key: "Confirm", duration: 0})
  loading.value=true
  let r: Result<string, string> = await bridge('confirmPort', state.value, JSON.parse(JSON.stringify(selected.value)))
  loading.value=false
  if (r.ok) {
    if (state.value == 'Export') {
      message.success({
        content: createVNode(`span`, {
          innerHTML: `成功导出至 ${r.val}，<a>点击查看</a>`
        }),
        key: "Confirm",
        duration: 3,
        onClick() {
          bridge('selectInExplorer', r.val)
        }
      })
    } else {
      message.success({
        content: r.val,
        key: "Confirm",
        duration: 3
      })
    }
    changeState('None')
  } else {
    message.error({content: r.val, key: "Confirm", duration: 3})
  }
  bus.emit('refreshSidebar')
}

function sortList() {
  let o = selectList.value, r
  switch (sortBy.value) {
    case "Name":
      r = o.sort((a, b) => {
        return a.info.title.localeCompare(b.info.title, "zh")
      })
      break
    case "Site":
      r = o.sort((a, b) => a.info.fromSite.localeCompare(b.info.fromSite, "zh"))
      break
    case "Type":
      r = o.sort((a, b) => a.info.type.localeCompare(b.info.type, "zh"))
      break
    case "Cate":
      r = o.sort((a, b) => a.info.category.localeCompare(b.info.category, "zh"))
      break
  }
  selectList.value = r
}

function selectHelper(method: 'All' | 'Safe' | 'None' | 'Closure', closure?: (n: { info: GameInfo, overwriteAlert: boolean }) => boolean) {
  switch (method) {
    case "All":
      selected.value = selectList.value.map(n => n.info)
      break
    case "None":
      selected.value = []
      break
    case "Safe":
      selected.value = selectList.value.filter(n => !n.overwriteAlert).map(n => n.info)
      break
    case "Closure":
      if (closure != undefined) {
        selected.value = selectList.value.filter(closure).map(n => n.info)
      }
      break
  }
}
</script>

<style scoped>

</style>
