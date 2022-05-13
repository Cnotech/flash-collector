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
        <a-button @click="initImportList">导入</a-button>
        <a-button @click="initExportList">导出</a-button>
      </a-space>
      <a-space v-else-if="state==='Import'">
        <a-button @click="changeState('None')">取消</a-button>
        <a-button :disabled="selected.length===0" type="primary" @click="confirm">导入{{ selected.length }}个游戏</a-button>
      </a-space>
      <a-space v-else-if="state==='Export'">
        <a-button @click="changeState('None')">取消</a-button>
        <a-button :disabled="selected.length===0" type="primary" @click="confirm">导出{{ selected.length }}个游戏</a-button>
      </a-space>
    </template>
  </a-page-header>

  <template v-if="state!=='None'">
    <strong style="margin-left: 4%;margin-right: 20px">请选择需要{{ state === 'Import' ? '导入' : '导出' }}的游戏</strong>
    <span>排序：</span>
    <a-select v-model:value="sortBy" size="small" @change="sortList">
      <a-select-option value="Name">名称</a-select-option>
      <a-select-option value="Type">类型</a-select-option>
      <a-select-option value="Site">来源</a-select-option>
    </a-select>
    <a-row style="margin-right: 5%;height: 70%;overflow: auto" type="flex">
      <a-col :span="1"/>
      <a-col :span="22">
        <a-checkbox-group v-model:value="selected" style="width: 100%">
          <a-list :data-source="selectList" item-layout="horizontal">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>
                    {{ item.title }}
                  </template>
                  <template #avatar>
                    <a-avatar v-if="item.local?.icon"
                              :src="`http://localhost:${port}/temp/${item.type}/${item.local?.folder}/${item.local?.icon}`"
                              shape="square"/>
                    <a-avatar v-else shape="square" style="background-color: #4bb117">{{ item.title.slice(0, 2) }}
                    </a-avatar>
                  </template>
                  <template #description>
                    <a-tag color="purple">{{ item.category }}</a-tag>
                    <a-tag color="cyan">{{ item.type }}</a-tag>
                    <a-tag color="green">{{ item.fromSite }}</a-tag>
                  </template>
                </a-list-item-meta>
                <template #extra>
                  <a-checkbox :value="item" style="margin-left: -20px"></a-checkbox>
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
import {ref} from "vue";
import {getConfig} from "../config";
import {GameInfo, List} from "../../../class";
import bridge from "../bridge";
import {Result} from "ts-results";
import {message} from "ant-design-vue";

type State = 'None' | 'Import' | 'Export'
type SortBy = 'Name' | 'Type' | 'Site'

let port = ref(3000),
    selectList = ref<GameInfo[]>([]),
    selected = ref<GameInfo[]>([]),
    state = ref<State>('None'),
    sortBy = ref<SortBy>('Name')

getConfig().then(c => port.value = c.port)

async function initImportList() {
  //等待选择文件
  let res: Result<List, string> = await bridge('initImportPackage')

  if (res.err) {
    message.error(res.val)
  } else {
    let r: GameInfo[] = []
    for (let type in res.val) {
      r = r.concat(res.val[type])
    }
    selectList.value = r
    changeState('Import')
  }
}

async function initExportList() {
  let r: List = await bridge('refresh')
  let res: GameInfo[] = []
  for (let type in r) {
    res = res.concat(r[type])
  }
  selectList.value = res
  changeState('Export')
}

function changeState(s: State) {
  state.value = s
}

function confirm() {
  console.log(selected.value)
  //注意提示重名文件夹
}

function sortList() {
  let o = selectList.value, r
  switch (sortBy.value) {
    case "Name":
      r = o.sort((a, b) => {
        return a.title.localeCompare(b.title, "zh")
      })
      break
    case "Site":
      r = o.sort((a, b) => a.fromSite.localeCompare(b.fromSite, "zh"))
      break
    case "Type":
      r = o.sort((a, b) => a.type.localeCompare(b.type, "zh"))
      break
  }
  selectList.value = r
}

</script>

<style scoped>

</style>
