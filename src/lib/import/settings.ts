export type Provider = 'anthropic' | 'openai'

export interface AiSettings {
  provider: Provider
  apiKey: string
  model: string
  /** OpenAI-compatible endpoints only, e.g. https://dashscope.aliyuncs.com/compatible-mode/v1 */
  baseUrl: string
}

const KEY = 'ffr-ai-settings'

export const DEFAULT_MODEL: Record<Provider, string> = { anthropic: 'claude-opus-5-5', openai: '' }

export const emptySettings = (): AiSettings => ({ provider: 'anthropic', apiKey: '', model: DEFAULT_MODEL.anthropic, baseUrl: '' })

export function loadSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptySettings()
    return { ...emptySettings(), ...(JSON.parse(raw) as Partial<AiSettings>) }
  } catch {
    return emptySettings()
  }
}

export function saveSettings(settings: AiSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Storage can be blocked; the settings then last for this visit only.
  }
}

/** Removes the key and everything else this feature stored. */
export function forgetSettings() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored to remove.
  }
}

export const isReady = (settings: AiSettings) =>
  settings.apiKey.trim().length > 0 && settings.model.trim().length > 0 && (settings.provider === 'anthropic' || settings.baseUrl.trim().length > 0)
