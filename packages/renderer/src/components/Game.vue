<template>
  Game
  <br/>
  Type:{{ route.query.type }}
  <br/>
  ID:{{ route.query.id }}
</template>

<script lang="ts" setup>
import {ref} from 'vue';
import {useRoute} from 'vue-router';

const route = useRoute()

</script>

<style scoped>

</style>
