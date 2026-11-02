import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'ffr-theme'
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
}

/** Follows the system until the visitor picks a side; the pick is remembered on this device. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? (systemDark() ? 'dark' : 'light'))

  useEffect(() => applyTheme(theme), [theme])

  useEffect(() => {
    if (storedTheme()) return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const follow = () => setTheme(query.matches ? 'dark' : 'light')
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // The choice still applies for this visit.
    }
    setTheme(next)
  }

  return { theme, toggle }
}
