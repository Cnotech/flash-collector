<template>
  <a-layout style="height: 100%">
    <a-layout-header class="header">
      <img alt="Icon" class="logo" src="./assets/favicon.ico"/>
      <div class="name">
        小游戏收集器
      </div>
    </a-layout-header>
    <a-layout>
      <a-layout-sider width="200" style="background: #fff">
        <a-menu
            v-model:openKeys="state.openKeys"
            v-model:selectedKeys="state.selectedKeys"
            v-on:click="onChangeMenu"
            mode="inline"
            :style="{ height: '100%', borderRight: 0 }"
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
          <!--          <a-sub-menu key="h5">-->
          <!--            <template #title>-->
          <!--              <span>-->
          <!--                <img class="icon" src="./assets/icons/html5.ico"/>-->
          <!--                HTML 5（{{ sidebarList.h5.length }}）-->
          <!--              </span>-->
          <!--            </template>-->
          <!--            <a-menu-item v-for="i of sidebarList.h5" :key="i.type+';'+i.local.folder">{{ i.title }}</a-menu-item>-->
          <!--          </a-sub-menu>-->
        </a-menu>
      </a-layout-sider>
      <a-layout style="padding: 16px;margin: 16px">
        <a-layout-content
            :style="{ background: '#fff', padding: '24px', margin: 0, minHeight: '280px' }"
        >
          <router-view/>
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-layout>
</template>
<script lang="ts" setup>
import {ref} from 'vue';
import {HomeFilled} from '@ant-design/icons-vue';
import {useRouter, useRoute} from 'vue-router';
import {bus} from './eventbus'
import {GameInfo, List} from "../../class";
import {ipcRenderer} from "electron";

const router = useRouter(), route = useRoute()

const state = ref({
  rootSubmenuKeys: ['home', 'flash', 'unity', 'h5'],
  openKeys: [],
  selectedKeys: route.path == '/game' ? [route.query.id] : ['home'],
});

function onChangeMenu(info: { item: string, key: string, keyPath: string[] }) {
  if (info.keyPath[0] == 'home') {
    router.push('/')
  } else {
    router.push(`/game?type=${info.keyPath[0]}&id=${info.keyPath[1]}`)
  }
}

//刷新侧边栏游戏列表
let sidebarList = ref<List>({flash: [], unity: [], h5: []})
bus.on('refreshSidebar', refreshSidebar)
ipcRenderer.on('refresh-reply', (e, p: List) => {
  sidebarList.value = p
})

function refreshSidebar() {
  ipcRenderer.send('refresh')
}

refreshSidebar()

</script>
<style>
.name {
  float: left;
  width: 120px;
  height: 48px;
  margin-left: 16px;
  padding: 0;
  color: #fff;
  font-size: larger;
}

.logo {
  float: left;
  width: 50px;
  height: 50px;
  margin: 8px 0 0 -25px;
  padding: 0;
}

.icon {
  height: 19px;
  width: 19px;
  margin-top: -3px;
}

.header {
  color: #eeeeee;
  background-color: #eeeeee;
}
</style>
