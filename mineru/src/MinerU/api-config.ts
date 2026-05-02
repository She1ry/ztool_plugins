const STORAGE_KEY = 'mineru_api_config'

export interface ApiConfig {
  endpoint: string
  apiKey: string
}

export function getDefaultConfig(): ApiConfig {
  return {
    endpoint: 'https://mineru.net/api/v4',
    apiKey: ''
  }
}

export function loadConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultConfig()
    const parsed = JSON.parse(raw) as Partial<ApiConfig>
    return {
      endpoint: parsed.endpoint || getDefaultConfig().endpoint,
      apiKey: parsed.apiKey || ''
    }
  } catch {
    return getDefaultConfig()
  }
}

export function saveConfig(config: ApiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

// ── Types ──────────────────────────────────────────────────────────────

export interface ExtractResult {
  markdown: string
}

interface BatchUploadResponse {
  code: number
  msg: string
  data: {
    batch_id: string
    file_urls: string[]
  }
}

interface ExtractProgress {
  extracted_pages: number
  total_pages: number
  start_time: string
}

interface BatchResultItem {
  file_name: string
  state: 'waiting-file' | 'pending' | 'running' | 'done' | 'failed' | 'converting'
  full_zip_url?: string
  err_msg?: string
  extract_progress?: ExtractProgress
}

interface BatchQueryResponse {
  code: number
  msg: string
  data: {
    batch_id: string
    extract_result: BatchResultItem[]
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function getHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  return headers
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Step 1: Request OSS upload URL ─────────────────────────────────────

async function requestUploadUrl(
  fileName: string,
  config: ApiConfig
): Promise<{ batchId: string; uploadUrl: string }> {
  const res = await fetch(`${config.endpoint}/file-urls/batch`, {
    method: 'POST',
    headers: getHeaders(config.apiKey),
    body: JSON.stringify({
      files: [{ name: fileName }],
      model_version: 'pipeline'
    })
  })

  if (!res.ok) {
    throw new Error(`HTTP_${res.status}`)
  }

  const data = (await res.json()) as BatchUploadResponse

  if (data.code !== 0) {
    throw new Error(`API_ERROR_${data.code}`)
  }

  return {
    batchId: data.data.batch_id,
    uploadUrl: data.data.file_urls[0]
  }
}

// ── Step 2: Upload file to OSS ─────────────────────────────────────────

async function uploadFile(uploadUrl: string, fileBuffer: ArrayBuffer): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: fileBuffer
  })

  if (!res.ok) {
    throw new Error(`HTTP_${res.status}`)
  }
}

// ── Step 3: Poll for result ────────────────────────────────────────────

async function pollBatchResult(
  batchId: string,
  config: ApiConfig,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const maxAttempts = 120
  const intervalMs = 3000

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(intervalMs)

    const res = await fetch(
      `${config.endpoint}/extract-results/batch/${batchId}`,
      {
        method: 'GET',
        headers: getHeaders(config.apiKey)
      }
    )

    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`)
    }

    const data = (await res.json()) as BatchQueryResponse

    if (data.code !== 0) {
      throw new Error(`API_ERROR_${data.code}`)
    }

    const result = data.data.extract_result[0]
    if (!result) {
      throw new Error('EMPTY_RESULT')
    }

    if (result.state === 'done') {
      if (!result.full_zip_url) {
        throw new Error('EMPTY_RESULT')
      }
      return result.full_zip_url
    }

    if (result.state === 'failed') {
      throw new Error(result.err_msg || '解析失败')
    }

    if (result.extract_progress) {
      const pct = Math.round(
        (result.extract_progress.extracted_pages / result.extract_progress.total_pages) * 100
      )
      onProgress?.(50 + pct / 2, `解析中 ${result.extract_progress.extracted_pages}/${result.extract_progress.total_pages} 页`)
    } else {
      onProgress?.(50, '排队等待解析…')
    }
  }

  throw new Error('POLL_TIMEOUT')
}

// ── Step 4: Download zip and extract markdown ──────────────────────────

async function downloadMarkdown(zipUrl: string): Promise<string> {
  const res = await fetch(zipUrl)
  if (!res.ok) {
    throw new Error(`HTTP_${res.status}`)
  }

  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await res.blob())

  // Find full.md in the zip
  const mdFile = Object.keys(zip.files).find(
    (name) => name.endsWith('full.md') || name === 'full.md'
  )

  if (!mdFile) {
    throw new Error('EMPTY_RESULT')
  }

  return zip.file(mdFile)!.async('string')
}

// ── Main entry ─────────────────────────────────────────────────────────

export async function callExtractApi(
  fileBuffer: ArrayBuffer,
  fileName: string,
  config: ApiConfig,
  onProgress?: (progress: number, message: string) => void
): Promise<ExtractResult> {
  // Step 1: Get upload URL
  onProgress?.(10, '申请上传链接…')
  const { batchId, uploadUrl } = await requestUploadUrl(fileName, config)

  // Step 2: Upload file
  onProgress?.(20, '上传文件中…')
  await uploadFile(uploadUrl, fileBuffer)

  // Step 3: Poll for result
  onProgress?.(30, '等待解析…')
  const zipUrl = await pollBatchResult(batchId, config, onProgress)

  // Step 4: Download and extract markdown
  onProgress?.(99, '下载结果…')
  const markdown = await downloadMarkdown(zipUrl)

  if (!markdown.trim()) {
    throw new Error('EMPTY_RESULT')
  }

  return { markdown }
}
