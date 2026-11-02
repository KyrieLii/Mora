import { CATEGORIES, FLOW_CATEGORIES, type Currency, type Frequency } from '@/engine'
import type { ImportLine, LineKind, ParseResult } from './types'

const KINDS: LineKind[] = ['asset', 'liability', 'income', 'expense']
const FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'annual', 'once']
const FALLBACK: Record<LineKind, string> = { asset: 'otherAsset', liability: 'otherDebt', income: 'incomeOther', expense: 'expenseOther' }

export function kindOf(category: string): LineKind | null {
  const balance = CATEGORIES.find((entry) => entry.id === category)
  if (balance) return balance.group === 'liability' ? 'liability' : 'asset'
  return FLOW_CATEGORIES.find((entry) => entry.id === category)?.kind ?? null
}

/** Pulls the first JSON object out of a reply that may wrap it in prose or a code fence. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1]! : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('no-json')
  return JSON.parse(body.slice(start, end + 1))
}

/**
 * Strips anything that looks like a card or account number from a name, as a second line of defence
 * behind the prompt: long digit runs, masked numbers like ****1234, and bracketed tail digits like (9191).
 */
export function scrubName(name: string): string {
  return name
    .replace(/[*＊xX•·]{2,}\s*\d{2,}/g, '')
    .replace(/[（(]\s*(?:尾号)?\s*\d{3,}\s*[)）]/g, '')
    .replace(/尾号\s*\d{3,}/g, '')
    .replace(/\d[\d\s-]{6,}\d/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 40)
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[,，\s¥$]/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** Validates the model's JSON into lines the app can hold. Anything malformed is dropped with a warning, never guessed. */
export function parseModelOutput(raw: unknown): ParseResult {
  const warnings: string[] = []
  const root = (typeof raw === 'string' ? extractJson(raw) : raw) as { lines?: unknown; warnings?: unknown } | null
  if (!root || typeof root !== 'object') return { lines: [], warnings: ['unreadable-response'] }
  if (Array.isArray(root.warnings)) warnings.push(...root.warnings.filter((entry): entry is string => typeof entry === 'string'))

  const seen = new Set<string>()
  const lines: ImportLine[] = []
  for (const entry of Array.isArray(root.lines) ? root.lines : []) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const amount = toNumber(record.amount)
    if (amount === null || amount <= 0) continue
    if (record.currency !== 'CNY' && record.currency !== 'USD') {
      warnings.push(`skipped-currency:${typeof record.name === 'string' ? scrubName(record.name) : ''}`)
      continue
    }
    const category = typeof record.category === 'string' ? record.category : ''
    const declared = KINDS.includes(record.kind as LineKind) ? (record.kind as LineKind) : null
    const actual = kindOf(category)
    // A category that contradicts the stated kind is filed under that kind's catch-all rather than trusted.
    const kind = declared ?? actual ?? 'asset'
    const safeCategory = actual === kind ? category : FALLBACK[kind]
    const name = scrubName(typeof record.name === 'string' ? record.name : '')
    const frequency = (kind === 'income' || kind === 'expense') && FREQUENCIES.includes(record.frequency as Frequency) ? (record.frequency as Frequency) : 'monthly'
    const line: ImportLine = {
      name,
      amount: Math.round(amount * 100) / 100,
      currency: record.currency as Currency,
      kind,
      category: safeCategory,
      frequency: kind === 'expense' && frequency === 'once' ? 'monthly' : frequency,
    }
    const payment = toNumber(record.monthlyPayment)
    if (kind === 'liability' && payment !== null && payment > 0) line.monthlyPayment = Math.round(payment * 100) / 100
    const fingerprint = `${line.kind}|${line.category}|${line.name}|${line.amount}|${line.currency}`
    if (seen.has(fingerprint)) continue
    seen.add(fingerprint)
    lines.push(line)
  }
  return { lines, warnings }
}
