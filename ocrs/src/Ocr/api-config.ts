const STORAGE_KEY = 'ocrs_api_config'

export interface ApiConfig {
  endpoint: string
  apiKey: string
}

export function getDefaultConfig(): ApiConfig {
  return {
    endpoint: 'https://ibv5fbv9z3i8vd68.aistudio-app.com/layout-parsing',
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
