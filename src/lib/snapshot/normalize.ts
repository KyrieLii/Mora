import {
  CATEGORIES,
  FLOW_CATEGORIES,
  deriveCashflow,
  type Currency,
  type FlowItem,
  type Frequency,
  type Item,
  type Period,
  type Scope,
  type Snapshot,
} from '@/engine'
import { similar } from '@/lib/import/match'

/** What an agent writes: a snapshot without ids or derived fields. Anything left out gets a sensible default. */
export interface SnapshotInput {
  date?: string
  period?: Period
  scope?: Scope
  baseCurrency?: Currency
  usdCny?: number
  fxDate?: string
  items?: Partial<Item>[]
  flows?: Partial<FlowItem>[]
  insurance?: string[]
}

export interface NormalizeResult {
  snapshot: Snapshot | null
  errors: string[]
  warnings: string[]
}

const CURRENCIES: Currency[] = ['CNY', 'USD']
const FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'annual', 'once']
const INSURANCE = ['life', 'critical', 'medical', 'none', 'unknown']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Reuses the id of a matching line from the previous review so the report can show what changed. */
function idFrom<T extends { id: string; category: string; name: string; currency: string }>(line: { category: string; name: string; currency: string }, pool: T[], taken: Set<string>, newId: () => string) {
  const match =
    pool.find((entry) => !taken.has(entry.id) && entry.category === line.category && entry.currency === line.currency && entry.name === line.name) ??
    pool.find((entry) => !taken.has(entry.id) && entry.category === line.category && entry.currency === line.currency && similar(entry.name, line.name))
  const id = match?.id ?? newId()
  taken.add(id)
  return id
}

/**
 * Turns agent-written input into a complete snapshot. Unknown categories, currencies or frequencies are errors,
 * never guessed; ids carry over from the previous review where a line matches by category, currency and name.
 */
export function normalizeSnapshot(
  input: unknown,
  { previous, fallbackRate, today, newId = () => crypto.randomUUID() }: { previous?: Snapshot; fallbackRate: { usdCny: number; date: string }; today: string; newId?: () => string },
): NormalizeResult {
  const errors: string[] = []
  const warnings: string[] = []
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { snapshot: null, errors: ['The input must be a JSON object.'], warnings }
  const raw = input as SnapshotInput

  const date = raw.date ?? today
  if (!ISO_DATE.test(date)) errors.push(`date must look like 2026-11-03, got ${JSON.stringify(raw.date)}.`)
  const period = raw.period ?? 'quarter'
  if (period !== 'quarter' && period !== 'year') errors.push(`period must be "quarter" or "year", got ${JSON.stringify(raw.period)}.`)
  const scope = raw.scope ?? 'family'
  if (scope !== 'family' && scope !== 'personal') errors.push(`scope must be "family" or "personal", got ${JSON.stringify(raw.scope)}.`)
  const baseCurrency = raw.baseCurrency ?? 'CNY'
  if (!CURRENCIES.includes(baseCurrency)) errors.push(`baseCurrency must be "CNY" or "USD", got ${JSON.stringify(raw.baseCurrency)}.`)
  const usdCny = raw.usdCny ?? previous?.usdCny ?? fallbackRate.usdCny
  if (!isNumber(usdCny) || usdCny <= 0) errors.push(`usdCny must be a positive number, got ${JSON.stringify(raw.usdCny)}.`)
  // The date belongs to whichever rate is used: the one given (from `ffr fx`, or the review date), the previous review's, or the bundled one.
  const fxDate = raw.usdCny !== undefined ? (raw.fxDate ?? date) : previous ? previous.fxDate : fallbackRate.date
  if (raw.fxDate !== undefined && !ISO_DATE.test(raw.fxDate)) errors.push(`fxDate must look like 2026-11-03, got ${JSON.stringify(raw.fxDate)}.`)
  if (raw.fxDate !== undefined && raw.usdCny === undefined) warnings.push('fxDate is ignored without usdCny.')

  const takenItems = new Set<string>()
  const items: Item[] = []
  ;(Array.isArray(raw.items) ? raw.items : []).forEach((entry, index) => {
    const where = `items[${index}]`
    const def = CATEGORIES.find((category) => category.id === entry?.category)
    if (!def) {
      const flowHint = FLOW_CATEGORIES.some((category) => category.id === entry?.category) ? ' It is an income or expense category; put it in "flows".' : ''
      errors.push(`${where}: unknown category ${JSON.stringify(entry?.category)}.${flowHint}`)
      return
    }
    const currency = entry.currency ?? baseCurrency
    if (!CURRENCIES.includes(currency)) return errors.push(`${where}: currency must be "CNY" or "USD"; convert ${JSON.stringify(entry.currency)} first.`)
    if (!isNumber(entry.amount) || entry.amount < 0) return errors.push(`${where}: amount must be a number of zero or more.`)
    if (entry.amount === 0) warnings.push(`${where}: amount is 0.`)
    const name = (typeof entry.name === 'string' && entry.name.trim()) || def.label
    if (/\d{6,}/.test(name.replace(/\s/g, ''))) warnings.push(`${where}: the name contains a long number; remove card or account numbers.`)
    const item: Item = { id: '', category: def.id, name, amount: entry.amount, currency }
    if (entry.isEstimate) item.isEstimate = true
    if (def.group === 'liability' && isNumber(entry.monthlyPayment) && entry.monthlyPayment > 0) item.monthlyPayment = entry.monthlyPayment
    if (def.id === 'rental' && isNumber(entry.monthlyRent) && entry.monthlyRent > 0) item.monthlyRent = entry.monthlyRent
    item.id = idFrom(item, previous?.items ?? [], takenItems, newId)
    items.push(item)
  })

  const takenFlows = new Set<string>()
  const flows: FlowItem[] = []
  ;(Array.isArray(raw.flows) ? raw.flows : []).forEach((entry, index) => {
    const where = `flows[${index}]`
    const def = FLOW_CATEGORIES.find((category) => category.id === entry?.category)
    if (!def) {
      const itemHint = CATEGORIES.some((category) => category.id === entry?.category) ? ' It is a balance category; put it in "items".' : ''
      errors.push(`${where}: unknown category ${JSON.stringify(entry?.category)}.${itemHint}`)
      return
    }
    const currency = entry.currency ?? baseCurrency
    if (!CURRENCIES.includes(currency)) return errors.push(`${where}: currency must be "CNY" or "USD"; convert ${JSON.stringify(entry.currency)} first.`)
    if (!isNumber(entry.amount) || entry.amount < 0) return errors.push(`${where}: amount must be a number of zero or more.`)
    const frequency = entry.frequency ?? def.frequency
    if (!FREQUENCIES.includes(frequency)) return errors.push(`${where}: frequency must be one of ${FREQUENCIES.join(', ')}.`)
    if (def.kind === 'expense' && frequency === 'once') return errors.push(`${where}: expenses cannot be one-off; use monthly, quarterly or annual.`)
    const flow: FlowItem = { id: '', category: def.id, name: (typeof entry.name === 'string' && entry.name.trim()) || def.label, amount: entry.amount, currency, frequency }
    const continues = entry.continues ?? def.continues
    if (def.kind === 'income' && continues) flow.continues = true
    flow.id = idFrom(flow, previous?.flows ?? [], takenFlows, newId)
    flows.push(flow)
  })

  const insurance = (Array.isArray(raw.insurance) ? raw.insurance : []).filter((entry) => {
    if (INSURANCE.includes(entry)) return true
    warnings.push(`insurance: ignored unknown value ${JSON.stringify(entry)}.`)
    return false
  })

  if (items.length === 0 && errors.length === 0) errors.push('There are no balance items; add at least one asset or liability.')
  if (!flows.some((flow) => FLOW_CATEGORIES.find((category) => category.id === flow.category)?.kind === 'expense'))
    warnings.push('There are no expense lines, so the safety cushion cannot be worked out.')
  if (errors.length > 0) return { snapshot: null, errors, warnings }

  const snapshot: Snapshot = {
    id: newId(),
    date,
    period,
    scope,
    baseCurrency,
    usdCny,
    fxDate,
    items,
    flows,
    insurance,
    cashflow: deriveCashflow(flows, baseCurrency, usdCny),
  }
  return { snapshot, errors, warnings }
}
