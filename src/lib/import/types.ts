import type { Currency, Frequency } from '@/engine'

export type LineKind = 'asset' | 'liability' | 'income' | 'expense'

/** One balance or flow the model read from a screenshot or pasted text, after validation. */
export interface ImportLine {
  name: string
  amount: number
  currency: Currency
  kind: LineKind
  category: string
  frequency: Frequency
  monthlyPayment?: number
}

export interface ParseResult {
  lines: ImportLine[]
  /** Short notes the model or the parser raised, such as a currency the app cannot hold. */
  warnings: string[]
}

export type Action = { type: 'add' } | { type: 'update'; targetId: string; previous: number }

/** A recognised line paired with what applying it would do to the draft. */
export interface Proposal {
  key: string
  line: ImportLine
  action: Action
  selected: boolean
}
