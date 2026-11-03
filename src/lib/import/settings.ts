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

/** Settings from .env, injected by the dev server only (see vite.config.ts); null in any build. */
declare const __FFR_ENV_AI__: Partial<AiSettings> | null | undefined

export function envSettings(): AiSettings | null {
  const env = typeof __FFR_ENV_AI__ === 'undefined' ? null : __FFR_ENV_AI__
  if (!env?.apiKey) return null
  const provider = env.provider ?? 'anthropic'
  return { ...emptySettings(), provider, model: DEFAULT_MODEL[provider], ...env } as AiSettings
}

/** True when the key in use came from .env, so it must not be written to the browser. */
export const usesEnvKey = (settings: AiSettings) => settings.apiKey !== '' && settings.apiKey === envSettings()?.apiKey

export function loadSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(KEY)
    const stored = raw ? { ...emptySettings(), ...(JSON.parse(raw) as Partial<AiSettings>) } : null
    if (stored?.apiKey) return stored
    return envSettings() ?? stored ?? emptySettings()
  } catch {
    return envSettings() ?? emptySettings()
  }
}

export function saveSettings(settings: AiSettings) {
  try {
    if (usesEnvKey(settings)) return
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
