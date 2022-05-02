<!--  <div class="logo-box">-->
<!--    <img style="height:140px;" src="./assets/electron.png" >-->
<!--    <span/>-->
<!--    <img style="height:140px;" src="./assets/vite.svg" >-->
<!--    <span/>-->
<!--    <img style="height:140px;" src="./assets/vue.png" >-->
<!--  </div>-->
<!--  <HelloWorld msg="Hello Vue 3 + TypeScript + Vite" />-->
<!--  <div class="static-public">-->
<!--    Place static files into the <code>src/renderer/public</code> folder-->
<!--    <img style="width:90px;" :src="'./images/node.png'" >-->
<!--  </div>-->

<template>
  <a-layout style="height: 100%">
    <a-layout-header class="header">
      <div class="logo">
        小游戏收集器
      </div>
    </a-layout-header>
    <a-layout>
      <a-layout-sider width="200" style="background: #fff">
        <a-menu
            v-model:selectedKeys="selectedKeys"
            v-model:openKeys="openKeys"
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
                Flash
              </span>
            </template>
            <a-menu-item key="game1">Game 1</a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="unity">
            <template #title>
              <span>
                <img class="icon" src="./assets/icons/unity3d.ico"/>
                Unity3D
              </span>
            </template>
            <a-menu-item key="game2">Game 2</a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="h5">
            <template #title>
              <span>
                <img class="icon" src="./assets/icons/html5.ico"/>
                HTML 5
              </span>
            </template>
            <a-menu-item key="game3">Game 3</a-menu-item>
          </a-sub-menu>
        </a-menu>
      </a-layout-sider>
      <a-layout style="padding: 16px;margin: 16px">
        <a-layout-content
            :style="{ background: '#fff', padding: '24px', margin: 0, minHeight: '280px' }"
        >
          Content
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-layout>
</template>
<script lang="ts" setup>
import {ref} from 'vue';
import {HomeFilled} from '@ant-design/icons-vue';


let selectedKeys = ref<string[]>(['home']),
    openKeys = ref<string[]>(['unity'])

</script>
<style>
.logo {
  float: left;
  width: 120px;
  height: 48px;
  margin-left: 16px;
  padding: 0;
  color: #fff;
  font-size: larger;
}
.icon {
  height: 19px;
  width: 19px;
  margin-top: -3px;
}
</style>
