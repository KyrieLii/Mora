import { CATEGORIES, FLOW_CATEGORIES, deriveCashflow, flowsFromCashflow, type FlowItem, type Item, type Snapshot } from '@/engine'

export interface Stored {
  draft: Snapshot
  history: Snapshot[]
  /** Kept so data saved by earlier prototypes still loads. */
  selected?: string[]
  isSample?: boolean
}

const STORAGE_KEY = 'ffr-prototype-v1'

/** Common categories a first sheet starts with, as empty rows. */
const PRESET_CATEGORIES = ['checking', 'stock', 'fund', 'home', 'mortgage']

export function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? (JSON.parse(raw) as Stored) : null
    // The sample family now lives on the guide page, so an old sample session starts fresh.
    if (!stored || stored.isSample) return null
    // Older drafts kept four summary numbers; turn them into editable income and expense lines.
    if (!stored.draft.flows) stored.draft.flows = flowsFromCashflow(stored.draft.cashflow, stored.draft.baseCurrency, () => crypto.randomUUID())
    return stored
  } catch {
    return null
  }
}

export function saveStored(value: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // The page still works for this visit without storage.
  }
}

export const today = () => new Date().toISOString().slice(0, 10)

export function newItem(category: string, currency: Snapshot['baseCurrency'], name?: string): Item {
  return {
    id: crypto.randomUUID(),
    category,
    name: name ?? CATEGORIES.find((entry) => entry.id === category)?.label ?? '',
    amount: 0,
    currency,
  }
}

export function newFlow(category: string, currency: Snapshot['baseCurrency'], name?: string): FlowItem {
  const def = FLOW_CATEGORIES.find((entry) => entry.id === category)
  return {
    id: crypto.randomUUID(),
    category,
    name: name ?? def?.label ?? '',
    amount: 0,
    currency,
    frequency: def?.frequency ?? 'monthly',
    continues: def?.continues,
  }
}

/** Keeps the engine's monthly summary in step with the editable lines and the current exchange rate. */
export function withDerivedCashflow(draft: Snapshot): Snapshot {
  return draft.flows ? { ...draft, cashflow: deriveCashflow(draft.flows, draft.baseCurrency, draft.usdCny) } : draft
}

export const emptyState = (usdCny: number, fxDate: string): Stored => ({
  draft: {
    id: crypto.randomUUID(),
    date: today(),
    period: 'quarter',
    scope: 'family',
    baseCurrency: 'CNY',
    usdCny,
    fxDate,
    insurance: [],
    items: PRESET_CATEGORIES.map((category) => newItem(category, 'CNY')),
    cashflow: { monthlyIncome: 0, incomeAfterLoss: 0, livingExpense: 0, severance: 0 },
    flows: [newFlow('salary', 'CNY'), newFlow('living', 'CNY')],
  },
  history: [],
})
