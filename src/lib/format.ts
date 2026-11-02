import type { Currency, Snapshot } from '@/engine'

export const symbol = (currency: Currency) => (currency === 'USD' ? '$' : '¥')

export function money(value: number, currency: Currency) {
  return `${value < 0 ? '-' : ''}${symbol(currency)}${Math.abs(Math.round(value)).toLocaleString('zh-CN')}`
}

/** Compact Chinese amounts keep narrow phone rows readable. */
export function shortMoney(value: number, currency: Currency) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e8) return `${sign}${symbol(currency)}${Number((abs / 1e8).toFixed(2))}亿`
  if (abs >= 1e4) return `${sign}${symbol(currency)}${Number((abs / 1e4).toFixed(abs >= 1e6 ? 0 : 1))}万`
  return money(value, currency)
}

export const signed = (value: number, format: (value: number) => string) =>
  `${value >= 0 ? '+' : ''}${format(value)}`

export const percent = (value: number) => `${Math.round(value * 100)}%`

/** Accepts what people type: 1,500 / 1.5万 / 3w / 0.2亿. Returns null when it is not a number. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[,，\s¥$]/g, '').toLowerCase()
  if (cleaned === '') return 0
  const match = cleaned.match(/^(\d*\.?\d*)(万|w|亿)?$/)
  if (!match || !match[1] || match[1] === '.') return null
  const unit = match[2] === '亿' ? 1e8 : match[2] ? 1e4 : 1
  return Math.round(Number(match[1]) * unit * 100) / 100
}

export function periodName(snapshot: Snapshot) {
  const year = snapshot.date.slice(0, 4)
  if (snapshot.period === 'year') return `${year} 年度盘点`
  const quarter = Math.ceil(Number(snapshot.date.slice(5, 7)) / 3)
  return `${year} 第 ${quarter} 季度盘点`
}
