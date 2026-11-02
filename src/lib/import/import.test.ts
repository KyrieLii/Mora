import { describe, expect, it } from 'vitest'
import type { Snapshot } from '@/engine'
import { applyProposals, proposeChanges } from './match'
import { extractJson, parseModelOutput, scrubName } from './parse'

// Fixtures are synthetic model replies; they do not come from any real screenshot.
const reply = {
  lines: [
    { name: '示例银行 活期', amount: 12000, currency: 'CNY', kind: 'asset', category: 'checking', frequency: 'monthly', monthlyPayment: null },
    { name: '示例证券', amount: 5000.5, currency: 'USD', kind: 'asset', category: 'stock', frequency: 'monthly', monthlyPayment: null },
    { name: '示例理财', amount: 0, currency: 'CNY', kind: 'asset', category: 'fund', frequency: 'monthly', monthlyPayment: null },
    { name: '港股账户', amount: 800, currency: 'OTHER', kind: 'asset', category: 'stock', frequency: 'monthly', monthlyPayment: null },
    { name: '示例房贷', amount: '1,200,000', currency: 'CNY', kind: 'liability', category: 'mortgage', frequency: 'monthly', monthlyPayment: 9000 },
    { name: '工资', amount: 30000, currency: 'CNY', kind: 'income', category: 'salary', frequency: 'monthly', monthlyPayment: null },
    { name: '车险', amount: 6000, currency: 'CNY', kind: 'expense', category: 'carInsurance', frequency: 'annual', monthlyPayment: null },
    { name: '示例银行 活期', amount: 12000, currency: 'CNY', kind: 'asset', category: 'checking', frequency: 'monthly', monthlyPayment: null },
  ],
  warnings: ['HKD balance found'],
}

describe('parseModelOutput', () => {
  it('keeps valid lines and drops zeros, other currencies and duplicates', () => {
    const { lines, warnings } = parseModelOutput(reply)
    expect(lines.map((line) => line.category)).toEqual(['checking', 'stock', 'mortgage', 'salary', 'carInsurance'])
    expect(lines.find((line) => line.category === 'mortgage')).toMatchObject({ amount: 1200000, monthlyPayment: 9000, kind: 'liability' })
    expect(lines.find((line) => line.category === 'carInsurance')?.frequency).toBe('annual')
    expect(warnings).toContain('HKD balance found')
    expect(warnings.some((entry) => entry.startsWith('skipped-currency'))).toBe(true)
  })

  it('files a category that contradicts its kind under the catch-all', () => {
    const { lines } = parseModelOutput({ lines: [{ name: 'x', amount: 1, currency: 'CNY', kind: 'liability', category: 'stock', frequency: 'monthly' }] })
    expect(lines[0]?.category).toBe('otherDebt')
  })

  it('reads JSON wrapped in prose or a code fence', () => {
    expect(extractJson('Here you go:\n```json\n{"lines":[],"warnings":[]}\n```')).toEqual({ lines: [], warnings: [] })
    expect(() => extractJson('sorry, no data')).toThrow()
  })

  it('removes account and card numbers from names', () => {
    expect(scrubName('示例账户(9191)')).toBe('示例账户')
    expect(scrubName('银行卡 尾号1234')).toBe('银行卡')
    expect(scrubName('储蓄卡 ****5678')).toBe('储蓄卡')
    expect(scrubName('卡 6222 0212 3456 7890')).toBe('卡')
  })
})

const draft: Snapshot = {
  id: 'd',
  date: '2026-11-03',
  period: 'quarter',
  scope: 'family',
  baseCurrency: 'CNY',
  usdCny: 7,
  fxDate: '2026-11-02',
  insurance: [],
  cashflow: { monthlyIncome: 0, incomeAfterLoss: 0, livingExpense: 0, severance: 0 },
  items: [
    { id: 'bank', category: 'checking', name: '活期', amount: 9000, currency: 'CNY' },
    { id: 'loan', category: 'mortgage', name: '房贷', amount: 1300000, currency: 'CNY', monthlyPayment: 8800 },
  ],
  flows: [{ id: 'pay', category: 'salary', name: '工资收入', amount: 28000, currency: 'CNY', frequency: 'monthly' }],
}

describe('proposeChanges and applyProposals', () => {
  const { lines } = parseModelOutput(reply)
  const proposals = proposeChanges(draft, lines)

  it('updates similar items and adds the rest', () => {
    expect(proposals.map((proposal) => proposal.action.type)).toEqual(['update', 'add', 'update', 'update', 'add'])
    expect(proposals[0]!.action).toEqual({ type: 'update', targetId: 'bank', previous: 9000 })
  })

  it('applies only selected proposals', () => {
    const chosen = proposals.map((proposal) => ({ ...proposal, selected: proposal.line.category !== 'stock' }))
    const next = applyProposals(draft, chosen)
    expect(next.items.find((item) => item.id === 'bank')?.amount).toBe(12000)
    expect(next.items.find((item) => item.id === 'loan')).toMatchObject({ amount: 1200000, monthlyPayment: 9000 })
    expect(next.items.some((item) => item.category === 'stock')).toBe(false)
    expect(next.flows?.find((flow) => flow.id === 'pay')?.amount).toBe(30000)
    expect(next.flows?.find((flow) => flow.category === 'carInsurance')).toMatchObject({ amount: 6000, frequency: 'annual', name: '车险' })
  })

  it('leaves the draft untouched when nothing is selected', () => {
    const next = applyProposals(draft, proposals.map((proposal) => ({ ...proposal, selected: false })))
    expect(next.items).toBe(draft.items)
  })
})
