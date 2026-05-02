interface MineruSaveFileApi {
  saveMarkdown(content: string, filePath: string): boolean
  readFileBase64(filePath: string): string
  readFileBuffer(filePath: string): ArrayBuffer
}

declare global {
  interface Window {
    mineruSaveFile: MineruSaveFileApi
  }
}

export {}
