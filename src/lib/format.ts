import type { Currency, Snapshot } from '@/engine'
import { activeLocale, messages } from '@/i18n'

export const symbol = (currency: Currency) => (currency === 'USD' ? '$' : '¥')

export function money(value: number, currency: Currency) {
  return `${value < 0 ? '-' : ''}${symbol(currency)}${Math.abs(Math.round(value)).toLocaleString(activeLocale() === 'zh' ? 'zh-CN' : 'en-US')}`
}

const trim = (value: number, digits: number) => Number(value.toFixed(digits))

/** Compact amounts keep narrow phone rows readable: 万/亿 in Chinese, K/M/B in English. */
export function shortMoney(value: number, currency: Currency) {
  const abs = Math.abs(value)
  const head = `${value < 0 ? '-' : ''}${symbol(currency)}`
  if (activeLocale() === 'zh') {
    if (abs >= 1e8) return `${head}${trim(abs / 1e8, 2)}亿`
    if (abs >= 1e4) return `${head}${trim(abs / 1e4, abs >= 1e6 ? 0 : 1)}万`
    return money(value, currency)
  }
  if (abs >= 1e9) return `${head}${trim(abs / 1e9, 2)}B`
  if (abs >= 1e6) return `${head}${trim(abs / 1e6, abs >= 1e8 ? 0 : 2)}M`
  if (abs >= 1e4) return `${head}${trim(abs / 1e3, abs >= 1e5 ? 0 : 1)}K`
  return money(value, currency)
}

export const signed = (value: number, format: (value: number) => string) =>
  `${value >= 0 ? '+' : ''}${format(value)}`

export const percent = (value: number) => `${Math.round(value * 100)}%`

const UNITS: Record<string, number> = { 万: 1e4, w: 1e4, 亿: 1e8, k: 1e3, m: 1e6, b: 1e9 }

/** Accepts what people type: 1,500 / 1.5万 / 3w / 0.2亿 / 15k / 1.2m. Returns null when it is not a number. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[,，\s¥$]/g, '').toLowerCase()
  if (cleaned === '') return 0
  const match = cleaned.match(/^(\d*\.?\d*)(万|w|亿|k|m|b)?$/)
  if (!match || !match[1] || match[1] === '.') return null
  return Math.round(Number(match[1]) * (match[2] ? UNITS[match[2]]! : 1) * 100) / 100
}

export function periodName(snapshot: Snapshot) {
  const year = snapshot.date.slice(0, 4)
  const t = messages()
  if (snapshot.period === 'year') return t.period.year(year)
  return t.period.quarter(year, Math.ceil(Number(snapshot.date.slice(5, 7)) / 3))
}
