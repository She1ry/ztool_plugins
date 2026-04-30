<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Screenshot from './Screenshot/index.vue'
import ColorPicker from './ColorPicker/index.vue'

const route = ref('')
const enterAction = ref<any>({})

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
  <Screenshot v-if="route === 'snipaste'" :enter-action="enterAction" />
  <ColorPicker v-if="route === 'colorpicker'" :enter-action="enterAction" />
</template>
