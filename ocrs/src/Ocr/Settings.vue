<script setup lang="ts">
import { reactive, ref } from 'vue'
import { loadConfig, saveConfig, type ApiConfig } from './api-config'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const config = reactive<ApiConfig>(loadConfig())
const saved = ref(false)

function handleSave() {
  saveConfig({ ...config })
  saved.value = true
  window.setTimeout(() => {
    saved.value = false
  }, 2000)
}

function handleBack() {
  emit('close')
}
</script>

<template>
  <main class="ocr-page">
    <section class="ocr-card">
      <div class="ocr-header">
        <div>
          <p class="eyebrow">API 设置</p>
          <h1>远程 OCR 配置</h1>
        </div>
      </div>

      <p class="message">配置远程 OCR 服务的 API 端点和密钥。</p>

      <div class="form-group">
        <label for="endpoint">API 端点</label>
        <input id="endpoint" v-model.trim="config.endpoint" type="url" placeholder="https://..." />
      </div>

      <div class="form-group">
        <label for="apiKey">API Key</label>
        <input id="apiKey" v-model.trim="config.apiKey" type="password" placeholder="输入 API Key" />
      </div>

      <div class="actions">
        <button type="button" @click="handleSave">保存配置</button>
        <button type="button" class="btn-secondary" @click="handleBack">返回</button>
        <span v-if="saved" class="save-hint">已保存</span>
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

.message {
  margin: 20px 0 0;
  line-height: 1.7;
}

.form-group {
  margin-top: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.form-group input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid rgba(88, 164, 246, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  color: inherit;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: var(--blue);
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.actions button {
  min-width: 108px;
  padding: 0 18px;
  border-radius: 10px;
}

.actions button.btn-secondary {
  background: rgba(107, 114, 128, 0.18);
  color: #374151;
}

.save-hint {
  color: #16a34a;
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .ocr-card {
    background: rgba(43, 45, 49, 0.94);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
  }

  .form-group label {
    color: #c4c7cc;
  }

  .form-group input {
    background: rgba(31, 32, 36, 0.84);
  }

  .actions button.btn-secondary {
    background: rgba(107, 114, 128, 0.3);
    color: #c4c7cc;
  }
}
</style>
