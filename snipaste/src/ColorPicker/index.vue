<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps({
  enterAction: {
    type: Object,
    required: true
  }
})

type PickerStatus = 'idle' | 'picking' | 'result'

const status = ref<PickerStatus>('idle')
const hexColor = ref('')
const rgbColor = ref('')
const copied = ref(false)

const displayColor = computed(() => hexColor.value || '#888888')
const textColor = computed(() => {
  if (!hexColor.value) return '#ffffff'
  const hex = hexColor.value.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff'
})

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function startPick() {
  status.value = 'picking'
  hexColor.value = ''
  rgbColor.value = ''
  copied.value = false

  try {
    window.ztools.hideMainWindow()
    await wait(180)

    window.ztools.screenColorPick((color) => {
      window.ztools.showMainWindow()
      hexColor.value = color.hex
      rgbColor.value = color.rgb
      status.value = 'result'
    })
  } catch (error) {
    window.ztools.showMainWindow()
    status.value = 'idle'
  }
}

function copyHex() {
  if (!hexColor.value) return
  window.ztools.copyText(hexColor.value)
  copied.value = true
  window.ztools.showNotification(`已复制 ${hexColor.value}`, '屏幕取色')
  setTimeout(() => { copied.value = false }, 1500)
}

function copyRgb() {
  if (!rgbColor.value) return
  window.ztools.copyText(rgbColor.value)
  copied.value = true
  window.ztools.showNotification(`已复制 ${rgbColor.value}`, '屏幕取色')
  setTimeout(() => { copied.value = false }, 1500)
}

function goToScreenshot() {
  window.ztools.redirect('snipaste', '')
}

watch(
  () => props.enterAction,
  () => {
    startPick()
  },
  { immediate: true }
)
</script>

<template>
  <main class="picker-page">
    <div class="picker-card">
      <div class="color-preview" :style="{ backgroundColor: displayColor, color: textColor }">
        <span class="color-hex">{{ hexColor || '点击取色' }}</span>
        <span class="color-rgb">{{ rgbColor || '移动鼠标选择颜色' }}</span>
      </div>

      <div v-if="status === 'picking'" class="picking-hint">
        <span class="crosshair">⊕</span>
        <span>移动鼠标选择颜色，单击确认</span>
      </div>

      <div v-if="status === 'result'" class="color-info">
        <div class="info-row">
          <span class="info-label">HEX</span>
          <span class="info-value">{{ hexColor }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">RGB</span>
          <span class="info-value">{{ rgbColor }}</span>
        </div>
      </div>

      <div class="picker-actions">
        <button v-if="status === 'result'" type="button" class="btn-copy-hex" @click="copyHex">
          {{ copied ? '已复制 ✓' : '复制 HEX' }}
        </button>
        <button v-if="status === 'result'" type="button" class="btn-copy-rgb" @click="copyRgb">
          复制 RGB
        </button>
        <button type="button" class="btn-repick" @click="startPick">
          {{ status === 'result' ? '重新取色' : '开始取色' }}
        </button>
        <button type="button" class="btn-goto-snip" @click="goToScreenshot">
          截图
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.picker-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-card {
  width: 100%;
  max-width: 420px;
  padding: 28px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow);
}

@media (prefers-color-scheme: dark) {
  .picker-card {
    background: rgba(43, 45, 49, 0.94);
  }
}

.color-preview {
  height: 140px;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.3s;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.color-hex {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

.color-rgb {
  font-size: 13px;
  opacity: 0.8;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

.picking-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px 0;
  color: var(--blue);
  font-size: 15px;
}

.crosshair {
  font-size: 22px;
}

.color-info {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(88, 164, 246, 0.08);
}

@media (prefers-color-scheme: dark) {
  .info-row {
    background: rgba(88, 164, 246, 0.12);
  }
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--blue);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.info-value {
  font-size: 15px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

.picker-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.picker-actions button {
  flex: 1;
  padding: 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
}

.btn-copy-hex {
  background: var(--blue);
}

.btn-copy-rgb {
  background: var(--purple);
}

.btn-repick {
  background: rgba(100, 100, 100, 0.2);
  color: inherit;
}

.btn-goto-snip {
  background: var(--blue);
}

@media (prefers-color-scheme: dark) {
  .btn-repick {
    background: rgba(255, 255, 255, 0.12);
  }
}
</style>
