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

// ── Abstracted API layer ──────────────────────────────────────────────
// Swap implementations here to switch remote providers without touching UI code.

export interface ExtractResult {
  markdown: string
  images?: Record<string, string>
}

/**
 * Call the remote extraction API.
 * Currently implements the MinerU API v4 protocol:
 *   POST {endpoint}/extract
 *   Authorization: Bearer {apiKey}
 *   Body: { file: base64, ...options }
 *
 * To switch providers, replace the fetch logic inside this function
 * while keeping the same signature and return type.
 */
export async function callExtractApi(
  base64Data: string,
  fileName: string,
  config: ApiConfig,
  signal?: AbortSignal
): Promise<ExtractResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const response = await fetch(`${config.endpoint}/extract`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      file: base64Data,
      fileName,
      useDocOrientationClassify: false,
      useDocUnwarping: false,
      useChartRecognition: false
    }),
    signal
  })

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`)
  }

  const data = await response.json()

  const markdown =
    data?.data?.markdown ||
    data?.result?.markdown ||
    data?.markdown ||
    ''

  if (!markdown) {
    throw new Error('EMPTY_RESULT')
  }

  const images = data?.data?.images || data?.result?.images || undefined

  return { markdown, images }
}
