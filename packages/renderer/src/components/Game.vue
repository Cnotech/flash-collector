<template>
  Game
  <br/>
  Type:{{ route.query.type }}
  <br/>
  ID:{{ route.query.id }}
  <br/>
  <a-button @click="parse('http://www.7k7k.com/flash/199407.htm')">发送</a-button>
</template>

<script lang="ts" setup>
import {ref} from 'vue';
import {useRoute} from 'vue-router';
import {ipcRenderer} from "electron";
import {Result} from "ts-results";

const route = useRoute()

function parse(url: string) {
  let result = ipcRenderer.sendSync('parse', url) as Result<any, string>
  console.log(result)
}
</script>

<style scoped>

</style>
