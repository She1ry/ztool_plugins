<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OcrResult } from '@paddleocr/paddleocr-js'
import { getOcr, disposeOcr } from './ocr-instance'

type OcrStatus = 'idle' | 'capturing' | 'loading-model' | 'recognizing' | 'success' | 'error' | 'cancelled'

const props = defineProps({
  enterAction: {
    type: Object,
    required: true
  }
})

let runId = 0

const status = ref<OcrStatus>('idle')
const message = ref('准备截图识别')
const errorMessage = ref('')
const recognizedText = ref('')
const elapsedMs = ref(0)
const itemCount = ref(0)
const averageScore = ref(0)
const progress = ref(0)

const isBusy = computed(() => ['capturing', 'loading-model', 'recognizing'].includes(status.value))
const statusTitle = computed(() => {
  const titles: Record<OcrStatus, string> = {
    idle: '截图 OCR 识别',
    capturing: '正在截图',
    'loading-model': '正在加载 OCR 模型',
    recognizing: '正在识别文字',
    success: '识别完成',
    error: '识别失败',
    cancelled: '截图 OCR 识别'
  }
  return titles[status.value]
})
const confidenceText = computed(() => {
  if (!itemCount.value) return '无文字结果'
  return `${Math.round(averageScore.value * 100)}%`
})

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function captureScreen() {
  return new Promise<string>((resolve, reject) => {
    try {
      window.ztools.screenCapture((imgBase64) => resolve(imgBase64))
    } catch (error) {
      reject(error)
    }
  })
}

function normalizeScreenshotToBlob(imgBase64: string) {
  if (!imgBase64) {
    throw new Error('已取消截图')
  }

  const dataUrl = imgBase64.startsWith('data:') ? imgBase64 : `data:image/png;base64,${imgBase64}`
  const [header, data] = dataUrl.split(',')
  if (!data) {
    throw new Error('截图数据格式不正确')
  }

  const mimeMatch = header.match(/^data:([^;]+);base64$/)
  const mime = mimeMatch?.[1] || 'image/png'
  const binary = window.atob(data)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new Blob([bytes.buffer], { type: mime })
}

const MAX_EDGE = 1280

function resizeImage(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      if (width <= MAX_EDGE && height <= MAX_EDGE) {
        resolve(blob)
        return
      }
      const scale = MAX_EDGE / Math.max(width, height)
      const targetW = Math.round(width * scale)
      const targetH = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法创建 canvas 上下文'))
        return
      }
      ctx.drawImage(img, 0, 0, targetW, targetH)
      canvas.toBlob((resized) => {
        if (resized) {
          resolve(resized)
        } else {
          reject(new Error('图片缩放失败'))
        }
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

function summarizeResult(result: OcrResult) {
  const items = result.items || []
  itemCount.value = items.length
  recognizedText.value = items.map((item) => item.text).join('\n')
  averageScore.value = items.length
    ? items.reduce((total, item) => total + item.score, 0) / items.length
    : 0
  elapsedMs.value = result.metrics?.totalMs || 0
}

function classifyError(error: unknown): { status: OcrStatus; message: string } {
  const msg = error instanceof Error ? error.message : String(error)
  if (msg === '已取消截图') {
    return { status: 'cancelled', message: '截图已取消。' }
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
    return { status: 'error', message: '网络异常，请检查网络后重试。' }
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { status: 'error', message: '识别超时，请重新截图后重试。' }
  }
  return { status: 'error', message: '识别过程中出现错误，可重新截图尝试。' }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

async function startOcr() {
  const currentRun = ++runId
  status.value = 'capturing'
  message.value = '请选择需要识别的屏幕区域。'
  errorMessage.value = ''
  recognizedText.value = ''
  elapsedMs.value = 0
  itemCount.value = 0
  averageScore.value = 0
  progress.value = 0

  try {
    window.ztools.hideMainWindow()
    await wait(180)

    let imgBase64: string | null = await captureScreen()
    if (currentRun !== runId) return

    const rawBlob = normalizeScreenshotToBlob(imgBase64)
    imgBase64 = null
    const image = await resizeImage(rawBlob)
    window.ztools.showMainWindow()

    status.value = 'loading-model'
    message.value = '正在加载 OCR 模型，首次使用可能需要联网下载。'
    progress.value = 10
    const ocr = await withTimeout(getOcr(), 120000)
    if (currentRun !== runId) return

    status.value = 'recognizing'
    message.value = '正在分析截图中的文字。'
    progress.value = 50
    const startedAt = performance.now()
    const results = await withTimeout(ocr.predict(image), 60000)
    if (currentRun !== runId) return

    const result = results[0]
    if (!result) {
      throw new Error('OCR 未返回识别结果')
    }

    summarizeResult(result)
    if (!elapsedMs.value) {
      elapsedMs.value = Math.round(performance.now() - startedAt)
    }
    progress.value = 100
    status.value = 'success'
    message.value = recognizedText.value ? '识别结果如下。' : '未识别到文字，可重新截图尝试。'
  } catch (error) {
    window.ztools.showMainWindow()
    const classified = classifyError(error)
    status.value = classified.status
    message.value = classified.message
    if (classified.status === 'error') {
      errorMessage.value = error instanceof Error ? error.message : String(error)
    }
  }
}

function copyText() {
  if (!recognizedText.value) return
  window.ztools.copyText(recognizedText.value)
  window.ztools.showNotification('识别文本已复制', '截图 OCR 识别')
}

watch(
  () => props.enterAction,
  () => {
    startOcr()
  },
  {
    immediate: true
  }
)
</script>

<template>
  <main class="ocr-page">
    <section class="ocr-card">
      <div class="ocr-header">
        <div>
          <p class="eyebrow">PaddleOCR.js</p>
          <h1>{{ statusTitle }}</h1>
        </div>
        <span class="status-pill" :class="status">{{ status }}</span>
      </div>

      <p class="message">{{ message }}</p>
      <p v-if="errorMessage && status === 'error'" class="error">{{ errorMessage }}</p>

      <div v-if="isBusy" class="progress" :class="{ determinate: progress > 0 }" aria-label="处理中">
        <span :style="progress > 0 ? { width: progress + '%', animation: 'none' } : undefined"></span>
      </div>

      <div v-if="status === 'success'" class="stats">
        <div>
          <strong>{{ itemCount }}</strong>
          <span>文本块</span>
        </div>
        <div>
          <strong>{{ confidenceText }}</strong>
          <span>平均置信度</span>
        </div>
        <div>
          <strong>{{ Math.round(elapsedMs) }}ms</strong>
          <span>识别耗时</span>
        </div>
      </div>

      <textarea
        v-if="status === 'success'"
        v-model="recognizedText"
        class="result"
        placeholder="未识别到文字"
      ></textarea>

      <div class="actions">
        <button type="button" :disabled="isBusy" @click="startOcr">重新截图</button>
        <button type="button" :disabled="!recognizedText || isBusy" @click="copyText">复制文本</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.ocr-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24px;
}

.ocr-card {
  max-width: 760px;
  margin: 0 auto;
  padding: 24px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 48px rgba(22, 42, 80, 0.12);
}

.ocr-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--blue);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 28px;
}

.status-pill {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(88, 164, 246, 0.14);
  color: var(--blue);
  font-size: 12px;
  white-space: nowrap;
}

.status-pill.error {
  background: rgba(220, 38, 38, 0.14);
  color: #dc2626;
}

.status-pill.success {
  background: rgba(22, 163, 74, 0.14);
  color: #16a34a;
}

.status-pill.cancelled {
  background: rgba(107, 114, 128, 0.14);
  color: #6b7280;
}

.message {
  margin: 20px 0 0;
  line-height: 1.7;
}

.error {
  margin: 12px 0 0;
  padding: 12px;
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.progress {
  height: 8px;
  margin-top: 22px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(88, 164, 246, 0.16);
}

.progress span {
  display: block;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: var(--blue);
  animation: progress 1.2s ease-in-out infinite;
}

.progress.determinate span {
  transition: width 0.3s ease;
  animation: none;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 22px;
}

.stats div {
  padding: 14px;
  border-radius: 12px;
  background: rgba(88, 164, 246, 0.1);
}

.stats strong,
.stats span {
  display: block;
}

.stats strong {
  font-size: 20px;
}

.stats span {
  margin-top: 6px;
  color: #667085;
  font-size: 13px;
}

.result {
  width: 100%;
  min-height: 260px;
  box-sizing: border-box;
  margin-top: 18px;
  padding: 14px;
  border: 1px solid rgba(88, 164, 246, 0.25);
  border-radius: 12px;
  resize: vertical;
  background: rgba(255, 255, 255, 0.72);
  color: inherit;
  line-height: 1.7;
  white-space: pre-wrap;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

.actions button {
  min-width: 108px;
  padding: 0 18px;
  border-radius: 10px;
}

@keyframes progress {
  0% {
    transform: translateX(-110%);
  }

  100% {
    transform: translateX(250%);
  }
}

@media (max-width: 640px) {
  .ocr-page {
    padding: 14px;
  }

  .ocr-card {
    padding: 18px;
  }

  .ocr-header,
  .actions {
    flex-direction: column;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .actions button {
    width: 100%;
  }
}

@media (prefers-color-scheme: dark) {
  .ocr-card {
    background: rgba(43, 45, 49, 0.94);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
  }

  .stats span {
    color: #c4c7cc;
  }

  .result {
    background: rgba(31, 32, 36, 0.84);
  }
}
</style>
