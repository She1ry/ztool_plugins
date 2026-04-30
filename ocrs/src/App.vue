<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Ocr from './Ocr/index.vue'
import { getOcr, disposeOcr } from './Ocr/ocr-instance'

const route = ref('')
const enterAction = ref<any>({})

onMounted(() => {
  window.ztools.onPluginEnter((action) => {
    route.value = action.code
    enterAction.value = action
    if (action.code === 'ocr') {
      getOcr()
    }
  })
  window.ztools.onPluginOut(() => {
    route.value = ''
    disposeOcr()
  })
})
</script>

<template>
  <Ocr v-if="route === 'ocr'" :enter-action="enterAction" />
</template>
