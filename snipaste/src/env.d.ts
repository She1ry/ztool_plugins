/// <reference types="vite/client" />
/// <reference types="@ztools-center/ztools-api-types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

interface SnipasteSaveResult {
  ok: boolean
  error?: string
}

declare global {
  interface Window {
    snipasteSaveImage(base64: string, filePath: string): SnipasteSaveResult
  }
}

export {}
