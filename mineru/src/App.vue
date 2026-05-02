<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MinerU from './MinerU/index.vue'

const route = ref('')
const enterAction = ref<Record<string, unknown>>({})

onMounted(() => {
  window.ztools.onPluginEnter((action) => {
    route.value = action.code
    enterAction.value = action
  })
  window.ztools.onPluginOut(() => {
    route.value = ''
  })
})
</script>

<template>
  <MinerU v-if="route === 'mineru'" :enter-action="enterAction" />
</template>
