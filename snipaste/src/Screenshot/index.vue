<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type ScreenshotStatus = 'idle' | 'capturing' | 'preview' | 'annotating' | 'cropping'

const props = defineProps({
  enterAction: {
    type: Object,
    required: true
  }
})

const status = ref<ScreenshotStatus>('idle')
const imgBase64 = ref('')
const imgUrl = ref('')
const errorMessage = ref('')
const annotationText = ref('')
const cropStart = ref<{ x: number; y: number } | null>(null)
const cropEnd = ref<{ x: number; y: number } | null>(null)
const isSelectingCrop = ref(false)

const isBusy = computed(() => status.value === 'capturing')

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function captureScreen(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      window.ztools.screenCapture((base64) => resolve(base64))
    } catch (error) {
      reject(error)
    }
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  if (!data) throw new Error('图片数据格式不正确')
  const mimeMatch = header.match(/^data:([^;]+);base64$/)
  const mime = mimeMatch?.[1] || 'image/png'
  const binary = window.atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

async function startScreenshot() {
  status.value = 'capturing'
  errorMessage.value = ''
  imgBase64.value = ''
  imgUrl.value = ''
  annotationText.value = ''
  cropStart.value = null
  cropEnd.value = null

  try {
    window.ztools.hideMainWindow()
    await wait(180)

    const result = await captureScreen()
    if (!result) {
      window.ztools.showMainWindow()
      status.value = 'idle'
      return
    }

    const dataUrl = result.startsWith('data:') ? result : `data:image/png;base64,${result}`
    imgBase64.value = dataUrl
    imgUrl.value = dataUrl
    window.ztools.showMainWindow()
    status.value = 'preview'
  } catch (error) {
    window.ztools.showMainWindow()
    status.value = 'idle'
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

function saveImage() {
  if (!imgBase64.value) return
  window.ztools.showSaveDialog({
    title: '保存截图',
    defaultPath: `screenshot_${Date.now()}.png`,
    filters: [{ name: 'PNG 图片', extensions: ['png'] }, { name: 'JPEG 图片', extensions: ['jpg'] }]
  })
}

function copyImage() {
  if (!imgBase64.value) return
  window.ztools.copyImage(imgBase64.value)
  window.ztools.showNotification('截图已复制到剪贴板', '截图贴图')
}

function startAnnotate() {
  if (!imgBase64.value) return
  status.value = 'annotating'
  annotationText.value = ''
}

function confirmAnnotate() {
  if (!annotationText.value.trim() || !imgBase64.value) {
    status.value = 'preview'
    return
  }

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const padding = 40
    const fontSize = 16
    const lineHeight = 24
    const lines = annotationText.value.split('\n')
    const textWidth = Math.max(...lines.map((l) => l.length)) * fontSize * 0.6
    const textAreaHeight = lines.length * lineHeight + padding

    canvas.width = img.width
    canvas.height = img.height + textAreaHeight
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    ctx.fillStyle = '#ffffff'
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.textAlign = 'left'
    lines.forEach((line, i) => {
      ctx.fillText(line, padding / 2, img.height + padding / 2 + (i + 1) * lineHeight - 4)
    })

    imgBase64.value = canvas.toDataURL('image/png')
    imgUrl.value = imgBase64.value
    status.value = 'preview'
    annotationText.value = ''
  }
  img.src = imgBase64.value
}

function cancelAnnotate() {
  annotationText.value = ''
  status.value = 'preview'
}

function startCrop() {
  if (!imgBase64.value) return
  status.value = 'cropping'
  cropStart.value = null
  cropEnd.value = null
  isSelectingCrop.value = false
}

function onCropMouseDown(e: MouseEvent) {
  if (status.value !== 'cropping') return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  cropStart.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  cropEnd.value = { ...cropStart.value }
  isSelectingCrop.value = true
}

function onCropMouseMove(e: MouseEvent) {
  if (!isSelectingCrop.value || status.value !== 'cropping') return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  cropEnd.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onCropMouseUp() {
  isSelectingCrop.value = false
}

function confirmCrop() {
  if (!cropStart.value || !cropEnd.value || !imgBase64.value) {
    status.value = 'preview'
    return
  }

  const img = new Image()
  img.onload = () => {
    const container = document.querySelector('.crop-container') as HTMLElement
    if (!container) return

    const rect = container.getBoundingClientRect()
    const scaleX = img.width / rect.width
    const scaleY = img.height / rect.height

    const x1 = Math.min(cropStart.value!.x, cropEnd.value!.x) * scaleX
    const y1 = Math.min(cropStart.value!.y, cropEnd.value!.y) * scaleY
    const x2 = Math.max(cropStart.value!.x, cropEnd.value!.x) * scaleX
    const y2 = Math.max(cropStart.value!.y, cropEnd.value!.y) * scaleY

    const cropW = Math.max(Math.round(x2 - x1), 1)
    const cropH = Math.max(Math.round(y2 - y1), 1)

    const canvas = document.createElement('canvas')
    canvas.width = cropW
    canvas.height = cropH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, Math.round(x1), Math.round(y1), cropW, cropH, 0, 0, cropW, cropH)

    imgBase64.value = canvas.toDataURL('image/png')
    imgUrl.value = imgBase64.value
    status.value = 'preview'
    cropStart.value = null
    cropEnd.value = null
  }
  img.src = imgBase64.value
}

function goToColorPicker() {
  window.ztools.redirect('colorpicker', '')
}

function cancelCrop() {
  cropStart.value = null
  cropEnd.value = null
  status.value = 'preview'
}

const cropStyle = computed(() => {
  if (!cropStart.value || !cropEnd.value) return {}
  const x = Math.min(cropStart.value.x, cropEnd.value.x)
  const y = Math.min(cropStart.value.y, cropEnd.value.y)
  const w = Math.abs(cropEnd.value.x - cropStart.value.x)
  const h = Math.abs(cropEnd.value.y - cropStart.value.y)
  return { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` }
})

watch(
  () => props.enterAction,
  () => {
    startScreenshot()
  },
  { immediate: true }
)
</script>

<template>
  <main class="screenshot-page">
    <!-- Preview / Crop overlay image -->
    <div v-if="imgUrl && status !== 'capturing'" class="image-area">
      <div
        class="crop-container"
        :class="{ cropping: status === 'cropping' }"
        @mousedown="onCropMouseDown"
        @mousemove="onCropMouseMove"
        @mouseup="onCropMouseUp"
        @mouseleave="onCropMouseUp"
      >
        <img :src="imgUrl" class="preview-img" />
        <div v-if="status === 'cropping' && cropStart && cropEnd" class="crop-selection" :style="cropStyle"></div>
        <div v-if="status === 'cropping'" class="crop-overlay"></div>
      </div>
    </div>

    <!-- Annotation input -->
    <div v-if="status === 'annotating'" class="annotation-panel">
      <textarea
        v-model="annotationText"
        class="annotation-input"
        placeholder="输入标注文字..."
        autofocus
      ></textarea>
      <div class="annotation-actions">
        <button type="button" class="btn-cancel" @click="cancelAnnotate">取消</button>
        <button type="button" class="btn-confirm" @click="confirmAnnotate">确认标注</button>
      </div>
    </div>

    <!-- Error -->
    <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

    <!-- Bottom toolbar -->
    <div v-if="status === 'preview'" class="toolbar">
      <button type="button" class="toolbar-btn btn-save" @click="saveImage" :disabled="isBusy">
        <span class="icon">💾</span>
        <span class="label">保存</span>
      </button>
      <button type="button" class="toolbar-btn btn-annotate" @click="startAnnotate" :disabled="isBusy">
        <span class="icon">✏️</span>
        <span class="label">批注</span>
      </button>
      <button type="button" class="toolbar-btn btn-crop" @click="startCrop" :disabled="isBusy">
        <span class="icon">✂️</span>
        <span class="label">裁剪</span>
      </button>
      <button type="button" class="toolbar-btn btn-copy" @click="copyImage" :disabled="isBusy">
        <span class="icon">📋</span>
        <span class="label">复制</span>
      </button>
      <button type="button" class="toolbar-btn btn-retry" @click="startScreenshot" :disabled="isBusy">
        <span class="icon">🔄</span>
        <span class="label">重截</span>
      </button>
      <div class="toolbar-divider"></div>
      <button type="button" class="toolbar-btn btn-colorpick" @click="goToColorPicker">
        <span class="icon">🎨</span>
        <span class="label">取色</span>
      </button>
    </div>

    <!-- Crop toolbar -->
    <div v-if="status === 'cropping'" class="toolbar crop-toolbar">
      <button type="button" class="toolbar-btn btn-cancel" @click="cancelCrop">
        <span class="label">取消</span>
      </button>
      <button type="button" class="toolbar-btn btn-confirm" @click="confirmCrop" :disabled="!cropStart || !cropEnd">
        <span class="label">确认裁剪</span>
      </button>
    </div>

    <!-- Capturing state -->
    <div v-if="status === 'capturing'" class="capturing-hint">
      <span class="spinner"></span>
      <span>请在屏幕上框选截图区域...</span>
    </div>
  </main>
</template>

<style scoped>
.screenshot-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.image-area {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  margin-bottom: 12px;
}

.crop-container {
  position: relative;
  display: inline-block;
  line-height: 0;
}

.crop-container.cropping {
  cursor: crosshair;
}

.preview-img {
  max-width: 100%;
  max-height: calc(100vh - 120px);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.crop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--radius);
  pointer-events: none;
}

.crop-selection {
  position: absolute;
  border: 2px dashed var(--blue);
  background: rgba(88, 164, 246, 0.1);
  box-sizing: border-box;
}

.annotation-panel {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow);
}

@media (prefers-color-scheme: dark) {
  .annotation-panel {
    background: rgba(43, 45, 49, 0.94);
  }
}

.annotation-input {
  width: 100%;
  min-height: 80px;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid rgba(88, 164, 246, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  color: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

@media (prefers-color-scheme: dark) {
  .annotation-input {
    background: rgba(31, 32, 36, 0.84);
  }
}

.annotation-input:focus {
  outline: none;
  border-color: var(--blue);
}

.annotation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.btn-cancel {
  background: rgba(100, 100, 100, 0.2);
  color: inherit;
  padding: 0 16px;
  border-radius: 8px;
}

.btn-confirm {
  background: var(--blue);
  padding: 0 16px;
  border-radius: 8px;
}

.error-msg {
  color: var(--red);
  text-align: center;
  padding: 12px;
  margin: 0 0 12px;
}

/* Bottom toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: var(--radius-lg);
  background: rgba(40, 40, 40, 0.92);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(12px);
}

@media (prefers-color-scheme: light) {
  .toolbar {
    background: rgba(255, 255, 255, 0.95);
  }
}

.toolbar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 14px;
  border-radius: 10px;
  background: transparent;
  color: #e0e0e0;
  transition: background 0.2s;
  min-width: 52px;
}

.toolbar-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

@media (prefers-color-scheme: light) {
  .toolbar-btn {
    color: #333;
  }
  .toolbar-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.06);
  }
}

.toolbar-btn .icon {
  font-size: 18px;
  line-height: 1.2;
}

.toolbar-btn .label {
  font-size: 11px;
  line-height: 1.2;
}

.btn-save { color: var(--green); }
.btn-annotate { color: var(--orange); }
.btn-crop { color: var(--purple); }
.btn-copy { color: var(--blue); }
.btn-retry { color: #e0e0e0; }
.btn-colorpick { color: var(--purple); }

.toolbar-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}

@media (prefers-color-scheme: light) {
  .toolbar-divider {
    background: rgba(0, 0, 0, 0.12);
  }
}

@media (prefers-color-scheme: light) {
  .btn-retry { color: #555; }
}

.crop-toolbar .toolbar-btn {
  flex-direction: row;
  min-width: 80px;
}

.capturing-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  color: var(--blue);
  font-size: 15px;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(88, 164, 246, 0.3);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
