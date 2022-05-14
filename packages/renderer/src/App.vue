<template>
  <a-layout-sider
      style="position: fixed;background: #fff;">
    <a-space style="margin:10px 0 10px 10px">
      <img alt="Icon" src="./assets/favicon.ico" style="height: 50px;width: 50px"/>
      <div style="font-weight: bolder;font-size: medium">
        Flash Collector
      </div>
      <br/>
    </a-space>
    <a-menu
        v-model:openKeys="state.openKeys"
        v-model:selectedKeys="state.selectedKeys"
        :style="{ height: '100%', borderRight: 0 }"
        v-on:click="onChangeMenu"
    >
      <a-menu-item key="home">
        <home-filled style="height: 20px;width: 20px"/>
        首页
      </a-menu-item>
      <a-sub-menu key="flash">
        <template #title>
              <span>
                <img class="icon" src="./assets/icons/flash.ico"/>
                Flash（{{ sidebarList.flash.length }}）
              </span>
        </template>
        <a-menu-item v-for="i of sidebarList.flash" :key="i.type+';'+i.local?.folder">
          <template #icon>
            <a-avatar v-if="i.local?.icon"
                      :src="`http://localhost:${port}/games/${i.type}/${i.local?.folder}/${i.local?.icon}`"
                      shape="square"
                      style="margin-top: -3px;margin-left: -5px"/>
            <a-avatar v-else shape="square" style="background-color: #4bb117;margin-top: -3px;margin-left: -5px">
              {{ i.title.slice(0, 2) }}
            </a-avatar>
          </template>
          {{ i.title }}
        </a-menu-item>
      </a-sub-menu>
      <a-sub-menu key="unity">
        <template #title>
              <span>
                <img class="icon" src="./assets/icons/unity3d.ico"/>
                Unity3D（{{ sidebarList.unity.length }}）
              </span>
        </template>
        <a-menu-item v-for="i of sidebarList.unity" :key="i.type+';'+i.local?.folder">
          <template #icon>
            <a-avatar v-if="i.local?.icon"
                      :src="`http://localhost:${port}/games/${i.type}/${i.local?.folder}/${i.local?.icon}`"
                      shape="square"
                      style="margin-top: -3px;margin-left: -5px"/>
            <a-avatar v-else shape="square" style="background-color: #4bb117;margin-top: -3px;margin-left: -5px">
              {{ i.title.slice(0, 2) }}
            </a-avatar>
          </template>
          {{ i.title }}
        </a-menu-item>
      </a-sub-menu>
      <a-sub-menu key="h5">
        <template #title>
                    <span>
                      <img class="icon" src="./assets/icons/html5.ico"/>
                      HTML 5（{{ sidebarList.h5.length }}）
                    </span>
        </template>
        <a-menu-item v-for="i of sidebarList.h5" :key="i.type+';'+i.local?.folder">
          <template #icon>
            <a-avatar v-if="i.local?.icon"
                      :src="`http://localhost:${port}/games/${i.type}/${i.local?.folder}/${i.local?.icon}`"
                      shape="square"
                      style="margin-top: -3px;margin-left: -5px"/>
            <a-avatar v-else shape="square" style="background-color: #4bb117;margin-top: -3px;margin-left: -5px">
              {{ i.title.slice(0, 2) }}
            </a-avatar>
          </template>
          {{ i.title }}
        </a-menu-item>
      </a-sub-menu>
      <a-menu-item key="port">
        <gold-filled style="height: 20px;width: 20px"/>
        港口
      </a-menu-item>
      <a-menu-item key="setting">
        <setting-filled style="height: 20px;width: 20px"/>
        设置
      </a-menu-item>
    </a-menu>
  </a-layout-sider>
  <a-layout style="height: 100%;margin-left: 200px">
    <a-layout>
      <a-layout style="padding: 16px;margin: 16px">
        <a-layout-content
            :style="{ background: '#fff', padding: '24px', margin: 0, minHeight: '280px', overflow:'auto'}"
        >
          <router-view/>
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-layout>
</template>
<script lang="ts" setup>
import {onMounted, ref} from 'vue';
import {GoldFilled, HomeFilled, SettingFilled} from '@ant-design/icons-vue';
import {useRoute, useRouter} from 'vue-router';
import {bus} from './eventbus'
import {List} from "../../class";
import bridge from "./bridge";
import {getConfig} from "./config";
import {ipcRenderer} from "electron"
import {message, notification} from 'ant-design-vue';
import {Option} from "ts-results";

const router = useRouter(), route = useRoute()

const state = ref({
  rootSubmenuKeys: ['home', 'flash', 'unity', 'h5'],
  openKeys: [],
  selectedKeys: route.path == '/game' ? [route.query.id] : ['home'],
});

let port = ref(3000)
getConfig().then(c => {
  port.value = c.port
})

//设置标题
bridge('version').then(ver => {
  document.title = `Flash Collector - 小游戏收集器 v${ver}`
})

function onChangeMenu(info: { item: string, key: string, keyPath: string[] }) {
  if (info.keyPath[0] == 'home') {
    router.push('/')
  } else if (info.keyPath[0] == 'setting') {
    router.push('/setting')
  } else if (info.keyPath[0] == 'port') {
    router.push('/port')
  } else {
    router.push(`/game?id=${info.keyPath[1]}`)
  }
}

//刷新侧边栏游戏列表
let sidebarList = ref<List>({flash: [], unity: [], h5: []})
bus.on('refreshSidebar', refreshSidebar)

async function refreshSidebar() {
  sidebarList.value = await bridge('refresh')
  //获取载入错误
  let err:Option<string>=await bridge('getLoadErrors')
  if(err.some){
    notification.error({
      message:"读取游戏配置出错",
      description:err.val
    })
  }
}

//响应式侧边栏高亮
function updateSidebarOpen() {
  const p = route.path
  if (p == '/') {
    state.value.selectedKeys = ['home']
  } else if (p == '/setting') {
    state.value.selectedKeys = ['setting']
  } else if (p == '/port') {
    state.value.selectedKeys = ['port']
  } else {
    //说明在Game
    state.value.selectedKeys = [route.query.id]
  }
}

router.afterEach(updateSidebarOpen)

onMounted(()=>{
  refreshSidebar()
  updateSidebarOpen()
})

</script>
<style>
.icon {
  height: 19px;
  width: 19px;
  margin-top: -3px;
}
</style>
