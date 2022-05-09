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
        <a-menu-item v-for="i of sidebarList.flash" :key="i.type+';'+i.local?.folder">{{ i.title }}</a-menu-item>
      </a-sub-menu>
      <a-sub-menu key="unity">
        <template #title>
              <span>
                <img class="icon" src="./assets/icons/unity3d.ico"/>
                Unity3D（{{ sidebarList.unity.length }}）
              </span>
        </template>
        <a-menu-item v-for="i of sidebarList.unity" :key="i.type+';'+i.local?.folder">{{ i.title }}</a-menu-item>
      </a-sub-menu>
      <a-sub-menu key="h5">
        <template #title>
                    <span>
                      <img class="icon" src="./assets/icons/html5.ico"/>
                      HTML 5（{{ sidebarList.h5.length }}）
                    </span>
        </template>
        <a-menu-item v-for="i of sidebarList.h5" :key="i.type+';'+i.local?.folder">{{ i.title }}</a-menu-item>
      </a-sub-menu>
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
import {ref} from 'vue';
import {HomeFilled, SettingFilled} from '@ant-design/icons-vue';
import {useRoute, useRouter} from 'vue-router';
import {bus} from './eventbus'
import {List} from "../../class";
import bridge from "./bridge";

const router = useRouter(), route = useRoute()

const state = ref({
  rootSubmenuKeys: ['home', 'flash', 'unity', 'h5'],
  openKeys: [],
  selectedKeys: route.path == '/game' ? [route.query.id] : ['home'],
});

//设置标题
bridge('version').then(ver => {
  document.title = `Flash Collector - 小游戏收集器 v${ver}`
})

function onChangeMenu(info: { item: string, key: string, keyPath: string[] }) {
  if (info.keyPath[0] == 'home') {
    router.push('/')
  } else if (info.keyPath[0] == 'setting') {
    router.push('/setting')
  } else {
    router.push(`/game?id=${info.keyPath[1]}`)
  }
}

//刷新侧边栏游戏列表
let sidebarList = ref<List>({flash: [], unity: [], h5: []})
bus.on('refreshSidebar', refreshSidebar)

async function refreshSidebar() {
  sidebarList.value = await bridge('refresh')
}

refreshSidebar()

//响应式侧边栏高亮
function updateSidebarOpen() {
  const p = route.path
  if (p == '/') {
    state.value.selectedKeys = ['home']
  } else if (p == '/setting') {
    state.value.selectedKeys = ['setting']
  } else {
    //说明在Game
    state.value.selectedKeys = [route.query.id]
  }
}

updateSidebarOpen()
router.afterEach(updateSidebarOpen)

</script>
<style>
.icon {
  height: 19px;
  width: 19px;
  margin-top: -3px;
}
</style>
