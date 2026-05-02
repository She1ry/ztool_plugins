<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { loadConfig, callExtractApi } from './api-config'
import Settings from './Settings.vue'
import './mineru-common.css'

type Status = 'idle' | 'selecting' | 'uploading' | 'parsing' | 'success' | 'error'

const props = defineProps({
  enterAction: {
    type: Object,
    required: true
  }
})

const status = ref<Status>('idle')
const message = ref('点击下方按钮选择 PDF 文件，或拖拽文件到窗口。')
const errorMessage = ref('')
const markdownText = ref('')
const fileName = ref('')
const elapsedMs = ref(0)
const progress = ref(0)
const showSettings = ref(false)

const isBusy = computed(() => ['selecting', 'uploading', 'parsing'].includes(status.value))
const statusTitle = computed(() => {
  if (showSettings.value) return 'API 设置'
  const titles: Record<Status, string> = {
    idle: 'MinerU PDF 解析',
    selecting: '选择文件',
    uploading: '上传中',
    parsing: '解析中',
    success: '解析完成',
    error: '解析失败'
  }
  return titles[status.value]
})

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function readFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(new Error('FILE_READ_ERROR'))
    reader.readAsDataURL(file)
  })
}

async function selectAndParsePdf() {
  const config = loadConfig()

  status.value = 'selecting'
  message.value = '请选择 PDF 文件。'
  errorMessage.value = ''
  markdownText.value = ''
  elapsedMs.value = 0
  progress.value = 0

  await wait(50)

  const result = window.ztools.showOpenDialog({
    title: '选择 PDF 文件',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile']
  })

  if (!result || (Array.isArray(result) && result.length === 0)) {
    status.value = 'idle'
    message.value = '已取消选择，点击下方按钮重新选择。'
    return
  }

  const filePath = Array.isArray(result) ? result[0] : result
  fileName.value = filePath.split(/[/\\]/).pop() || 'document.pdf'

  try {
    status.value = 'uploading'
    message.value = `正在读取文件：${fileName.value}`
    progress.value = 20

    let base64Data: string
    if (window.mineruSaveFile) {
      base64Data = window.mineruSaveFile.readFileBase64(filePath)
    } else {
      throw new Error('PRELOAD_NOT_AVAILABLE')
    }

    status.value = 'parsing'
    message.value = '正在调用远程接口解析，请稍候…'
    progress.value = 50

    const startedAt = performance.now()
    const result = await callExtractApi(base64Data, fileName.value, config)

    markdownText.value = result.markdown
    elapsedMs.value = Math.round(performance.now() - startedAt)
    progress.value = 100
    status.value = 'success'
    message.value = `解析完成！文件：${fileName.value}`
  } catch (error) {
    status.value = 'error'
    message.value = classifyErrorMessage(error)
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

function classifyErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  if (msg === 'PRELOAD_NOT_AVAILABLE') return '文件读取服务不可用，请重启插件。'
  if (msg === 'FILE_READ_ERROR') return '文件读取失败，请重试。'
  if (msg === 'HTTP_401' || msg === 'HTTP_403') return 'API Key 无效，请检查配置。'
  if (msg === 'HTTP_429') return '请求过于频繁，请稍后再试。'
  if (msg === 'HTTP_413') return '文件过大，请选择较小的 PDF。'
  if (msg === 'EMPTY_RESULT') return '接口未返回解析结果，请检查文件格式。'
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) return '网络异常，请检查网络后重试。'
  if (msg.includes('timeout') || msg.includes('timed out')) return '解析超时，请重试。'
  return '解析过程中出现错误，可重试。'
}

function copyMarkdown() {
  if (!markdownText.value) return
  window.ztools.copyText(markdownText.value)
  window.ztools.showNotification('Markdown 已复制', 'MinerU PDF 解析')
}

async function saveMarkdown() {
  if (!markdownText.value) return

  const safeName = fileName.value.replace(/\.pdf$/i, '') || 'document'
  const result = window.ztools.showSaveDialog({
    title: '保存 Markdown',
    defaultPath: `${safeName}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })

  if (!result) return

  const filePath = Array.isArray(result) ? result[0] : result

  try {
    if (window.mineruSaveFile) {
      window.mineruSaveFile.saveMarkdown(markdownText.value, filePath)
    } else {
      throw new Error('PRELOAD_NOT_AVAILABLE')
    }
    window.ztools.showNotification(`已保存到 ${filePath}`, 'MinerU PDF 解析')
  } catch (error) {
    window.ztools.showNotification('保存失败，请重试', 'MinerU PDF 解析')
  }
}

function handleFileDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    window.ztools.showNotification('请拖入 PDF 文件', 'MinerU PDF 解析')
    return
  }
  parseDroppedFile(file)
}

function parseDroppedFile(file: File) {
  const config = loadConfig()

  status.value = 'uploading'
  message.value = `正在读取文件：${file.name}`
  errorMessage.value = ''
  markdownText.value = ''
  fileName.value = file.name
  elapsedMs.value = 0
  progress.value = 20

  wait(30).then(async () => {
    try {
      const base64Data = await readFileBase64(file)

      status.value = 'parsing'
      message.value = '正在调用远程接口解析，请稍候…'
      progress.value = 50

      const startedAt = performance.now()
      const result = await callExtractApi(base64Data, file.name, config)

      markdownText.value = result.markdown
      elapsedMs.value = Math.round(performance.now() - startedAt)
      progress.value = 100
      status.value = 'success'
      message.value = `解析完成！文件：${file.name}`
    } catch (error) {
      status.value = 'error'
      message.value = classifyErrorMessage(error)
      errorMessage.value = error instanceof Error ? error.message : String(error)
    }
  })
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
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
    if (!showSettings.value && status.value === 'idle') {
      selectAndParsePdf()
    }
  },
  { immediate: true }
)
</script>

<template>
  <Settings v-if="showSettings" @close="closeSettings" />

  <main
    v-else
    class="mineru-page"
    @drop="handleFileDrop"
    @dragover="handleDragOver"
  >
    <section class="mineru-card">
      <div class="mineru-header">
        <div class="header-left">
          <p class="eyebrow">MinerU</p>
          <h1>{{ statusTitle }}</h1>
          <span class="status-pill" :class="status">{{ status }}</span>
        </div>
        <div class="header-right">
          <button type="button" class="icon-btn" title="选择文件" :disabled="isBusy" @click="selectAndParsePdf">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </button>
          <button type="button" class="icon-btn" title="复制 Markdown" :disabled="!markdownText || isBusy" @click="copyMarkdown">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
          <button type="button" class="icon-btn" title="保存到本地" :disabled="!markdownText || isBusy" @click="saveMarkdown">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
          <button type="button" class="icon-btn" title="API 设置" @click="openSettings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </div>

      <p class="message">{{ message }}</p>
      <p v-if="errorMessage && status === 'error'" class="error">{{ errorMessage }}</p>

      <div v-if="isBusy" class="progress" :class="{ determinate: progress > 0 }" aria-label="处理中">
        <span :style="progress > 0 ? { width: progress + '%', animation: 'none' } : undefined"></span>
      </div>

      <div v-if="status === 'success'" class="stats">
        <strong>{{ elapsedMs }}ms</strong>
        <span>解析耗时</span>
      </div>

      <div v-if="status === 'idle'" class="drop-hint">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
        <p>拖拽 PDF 到此处，或点击左上角文件夹按钮选择文件</p>
      </div>

      <textarea
        v-if="status === 'success'"
        v-model="markdownText"
        class="result"
        placeholder="解析结果将显示在这里"
      ></textarea>
    </section>
  </main>
</template>

<style scoped>
.mineru-card {
  display: flex;
  flex-direction: column;
}

.header-left {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #667085;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.icon-btn:hover:not(:disabled) {
  background: rgba(88, 164, 246, 0.12);
  color: var(--blue);
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.status-pill {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(88, 164, 246, 0.14);
  color: var(--blue);
  font-size: 11px;
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

.status-pill.parsing,
.status-pill.uploading {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}

.error {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  font-size: 13px;
}

.progress {
  height: 6px;
  margin-top: 14px;
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
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
}

.stats strong {
  font-size: 18px;
}

.stats span {
  color: #667085;
  font-size: 12px;
}

.drop-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding: 40px 20px;
  border: 2px dashed rgba(88, 164, 246, 0.25);
  border-radius: 12px;
  color: #9ca3af;
  text-align: center;
}

.drop-hint p {
  margin: 0;
  font-size: 14px;
}

.result {
  flex: 1;
  width: 100%;
  min-height: 120px;
  box-sizing: border-box;
  margin-top: 10px;
  padding: 12px;
  border: 1px solid rgba(88, 164, 246, 0.25);
  border-radius: 10px;
  resize: vertical;
  background: rgba(255, 255, 255, 0.72);
  color: inherit;
  line-height: 1.7;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
}

@keyframes progress {
  0% {
    transform: translateX(-110%);
  }

  100% {
    transform: translateX(250%);
  }
}

@media (prefers-color-scheme: dark) {
  .stats span {
    color: #c4c7cc;
  }

  .result {
    background: rgba(31, 32, 36, 0.84);
  }

  .icon-btn {
    color: #c4c7cc;
  }

  .drop-hint {
    color: #6b7280;
  }
}
</style>
