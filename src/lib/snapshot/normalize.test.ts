import { describe, expect, it } from 'vitest'
import { digest } from './digest'
import { normalizeSnapshot } from './normalize'

let counter = 0
const options = { fallbackRate: { usdCny: 7, date: '2026-10-30' }, today: '2026-11-03', newId: () => `id-${++counter}` }

// A fictional household written the way an agent would.
const input = {
  period: 'quarter',
  items: [
    { category: 'checking', name: '活期', amount: 50000, currency: 'CNY' },
    { category: 'stock', name: '美股账户', amount: 10000, currency: 'USD' },
    { category: 'mortgage', name: '房贷', amount: 800000, monthlyPayment: 6000 },
  ],
  flows: [
    { category: 'salary', name: '工资', amount: 30000 },
    { category: 'living', amount: 12000 },
    { category: 'carInsurance', amount: 6000 },
  ],
}

describe('normalizeSnapshot', () => {
  it('fills defaults and derives the monthly cash flow', () => {
    const { snapshot, errors } = normalizeSnapshot(input, options)
    expect(errors).toEqual([])
    expect(snapshot).toMatchObject({ date: '2026-11-03', scope: 'family', baseCurrency: 'CNY', usdCny: 7, fxDate: '2026-10-30' })
    expect(snapshot!.items[2]).toMatchObject({ currency: 'CNY', monthlyPayment: 6000 })
    expect(snapshot!.flows!.find((flow) => flow.category === 'carInsurance')?.frequency).toBe('annual')
    expect(snapshot!.cashflow.monthlyIncome).toBe(30000)
    expect(snapshot!.cashflow.livingExpense).toBe(12500)
  })

  it('reports unknown categories, currencies and misplaced lines instead of guessing', () => {
    const { snapshot, errors } = normalizeSnapshot(
      { items: [{ category: 'gold', amount: 1 }, { category: 'salary', amount: 1 }, { category: 'checking', amount: 1, currency: 'HKD' }], flows: [{ category: 'rent', amount: 1, frequency: 'once' }] },
      options,
    )
    expect(snapshot).toBeNull()
    expect(errors).toHaveLength(4)
    expect(errors[1]).toContain('put it in "flows"')
  })

  it('keeps ids from the previous review for matching lines', () => {
    const first = normalizeSnapshot(input, options).snapshot!
    const second = normalizeSnapshot({ ...input, items: [{ category: 'checking', name: '招行 活期', amount: 60000 }, ...input.items.slice(1)] }, { ...options, previous: first }).snapshot!
    expect(second.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id))
    expect(second.usdCny).toBe(7)
  })

  it('keeps each rate with its own date', () => {
    const fetched = normalizeSnapshot({ ...input, usdCny: 6.65, fxDate: '2026-10-31' }, options).snapshot!
    expect(fetched).toMatchObject({ usdCny: 6.65, fxDate: '2026-10-31' })
    expect(normalizeSnapshot({ ...input, usdCny: 6.7 }, options).snapshot!.fxDate).toBe('2026-11-03')
    expect(normalizeSnapshot({ ...input, date: '2027-02-01' }, { ...options, previous: fetched }).snapshot).toMatchObject({ usdCny: 6.65, fxDate: '2026-10-31' })
    expect(normalizeSnapshot({ ...input, usdCny: 6.7, fxDate: 'today' }, options).errors[0]).toContain('fxDate')
  })

  it('warns about long numbers in names', () => {
    const { warnings } = normalizeSnapshot({ ...input, items: [{ category: 'checking', name: '储蓄卡 6222021234567890', amount: 1 }] }, options)
    expect(warnings.some((warning) => warning.includes('card or account'))).toBe(true)
  })
})

describe('digest', () => {
  it('summarises a review and its change since the previous one', () => {
    const first = normalizeSnapshot(input, options).snapshot!
    const second = normalizeSnapshot({ ...input, items: [{ category: 'checking', name: '活期', amount: 70000 }, ...input.items.slice(1)] }, { ...options, previous: first }).snapshot!
    const result = digest(second, first)
    expect(result.netWorth).toBe(70000 + 70000 - 800000)
    expect(result.sincePrevious?.netWorthChange).toBe(20000)
    expect(result.safetyCushion.rating).toMatch(/tight|moderate|ample/)
  })
})
