import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { en } from './en'
import { zh, type Messages } from './zh'

export type Locale = 'zh' | 'en'

const MESSAGES: Record<Locale, Messages> = { zh, en }
const KEY = 'ffr-locale'

/** The active locale for formatting helpers that are not React components. Set by the provider on every render. */
let active: Locale = 'zh'
export const activeLocale = () => active
export const messages = (locale: Locale = active) => MESSAGES[locale]

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'zh' || stored === 'en') return stored
  } catch {
    // Fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

interface I18n {
  locale: Locale
  t: Messages
  toggle: () => void
}

const I18nContext = createContext<I18n>({ locale: 'zh', t: zh, toggle: () => undefined })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale)
  active = locale

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.title = MESSAGES[locale].appName
  }, [locale])

  const toggle = () => {
    const next = locale === 'zh' ? 'en' : 'zh'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // The choice still applies for this visit.
    }
    setLocale(next)
  }

  return <I18nContext.Provider value={{ locale, t: MESSAGES[locale], toggle }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
