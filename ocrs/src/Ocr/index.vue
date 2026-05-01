<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { loadConfig } from './api-config'
import Settings from './Settings.vue'

type OcrStatus = 'idle' | 'capturing' | 'recognizing' | 'success' | 'error' | 'cancelled'

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
const progress = ref(0)
const showSettings = ref(false)

const isBusy = computed(() => ['capturing', 'recognizing'].includes(status.value))
const statusTitle = computed(() => {
  if (showSettings.value) return 'API 设置'
  const titles: Record<OcrStatus, string> = {
    idle: '截图 OCR 识别',
    capturing: '正在截图',
    recognizing: '正在识别文字',
    success: '识别完成',
    error: '识别失败',
    cancelled: '截图 OCR 识别'
  }
  return titles[status.value]
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

function extractBase64(imgBase64: string): string {
  if (imgBase64.startsWith('data:')) {
    const commaIndex = imgBase64.indexOf(',')
    return commaIndex >= 0 ? imgBase64.slice(commaIndex + 1) : imgBase64
  }
  return imgBase64
}

interface ApiResponse {
  result: {
    layoutParsingResults: Array<{ markdown: { text: string } }>
  }
}

async function callOcrApi(base64Data: string): Promise<string> {
  const config = loadConfig()
  if (!config.apiKey) {
    throw new Error('API_KEY_MISSING')
  }

  const payload = {
    file: base64Data,
    fileType: 1,
    useDocOrientationClassify: false,
    useDocUnwarping: false,
    useChartRecognition: false
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `token ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`)
  }

  const data = (await response.json()) as ApiResponse
  const results = data?.result?.layoutParsingResults
  if (!results || results.length === 0) {
    throw new Error('EMPTY_RESULT')
  }
  return results[0].markdown.text
}

function classifyError(error: unknown): { status: OcrStatus; message: string } {
  const msg = error instanceof Error ? error.message : String(error)
  if (msg === '已取消截图') {
    return { status: 'cancelled', message: '截图已取消。' }
  }
  if (msg === 'API_KEY_MISSING') {
    return { status: 'error', message: '请先配置 API Key。' }
  }
  if (msg === 'HTTP_401' || msg === 'HTTP_403') {
    return { status: 'error', message: 'API Key 无效，请检查配置。' }
  }
  if (msg === 'HTTP_429') {
    return { status: 'error', message: '请求过于频繁，请稍后再试。' }
  }
  if (msg === 'EMPTY_RESULT') {
    return { status: 'error', message: 'API 未返回识别结果。' }
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
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (val) => { window.clearTimeout(timer); resolve(val) },
      (err) => { window.clearTimeout(timer); reject(err) }
    )
  })
}

async function startOcr() {
  const config = loadConfig()
  if (!config.apiKey) {
    showSettings.value = true
    return
  }

  const currentRun = ++runId
  status.value = 'capturing'
  message.value = '请选择需要识别的屏幕区域。'
  errorMessage.value = ''
  recognizedText.value = ''
  elapsedMs.value = 0
  progress.value = 0

  try {
    window.ztools.hideMainWindow()
    await wait(180)

    const imgBase64 = await captureScreen()
    if (currentRun !== runId) return

    if (!imgBase64) {
      throw new Error('已取消截图')
    }

    window.ztools.showMainWindow()

    status.value = 'recognizing'
    message.value = '正在调用远程 API 识别文字。'
    progress.value = 30

    const base64Data = extractBase64(imgBase64)
    const startedAt = performance.now()

    const text = await withTimeout(callOcrApi(base64Data), 60000)
    if (currentRun !== runId) return

    recognizedText.value = text
    elapsedMs.value = Math.round(performance.now() - startedAt)
    progress.value = 100
    status.value = 'success'
    message.value = text ? '识别结果如下。' : '未识别到文字，可重新截图尝试。'
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

function openSettings() {
  showSettings.value = true
}

function closeSettings() {
  showSettings.value = false
}

watch(
  () => props.enterAction,
  () => {
    if (!showSettings.value) {
      startOcr()
    }
  },
  {
    immediate: true
  }
)
</script>

<template>
  <Settings v-if="showSettings" @close="closeSettings" />

  <main v-else class="ocr-page">
    <section class="ocr-card">
      <div class="ocr-header">
        <div>
          <p class="eyebrow">Remote OCR</p>
          <h1>{{ statusTitle }}</h1>
        </div>
        <div class="header-right">
          <button type="button" class="icon-btn" title="API 设置" @click="openSettings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
          <span class="status-pill" :class="status">{{ status }}</span>
        </div>
      </div>

      <p class="message">{{ message }}</p>
      <p v-if="errorMessage && status === 'error'" class="error">{{ errorMessage }}</p>

      <div v-if="isBusy" class="progress" :class="{ determinate: progress > 0 }" aria-label="处理中">
        <span :style="progress > 0 ? { width: progress + '%', animation: 'none' } : undefined"></span>
      </div>

      <div v-if="status === 'success'" class="stats">
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

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #667085;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.icon-btn:hover {
  background: rgba(88, 164, 246, 0.12);
  color: var(--blue);
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

  .icon-btn {
    color: #c4c7cc;
  }
}
</style>
