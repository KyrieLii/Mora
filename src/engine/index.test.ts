import { describe, expect, it } from 'vitest'
import {
  deriveCashflow,
  flowsFromCashflow,
  diffSnapshots,
  calculateCushion,
  summarize,
  toBase,
  yearlyHeadlineTier,
  type Snapshot,
} from './index'

const snapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
  id: 's1',
  date: '2026-11-02',
  period: 'year',
  scope: 'family',
  baseCurrency: 'CNY',
  usdCny: 7,
  fxDate: '2026-11-01',
  insurance: ['medical'],
  cashflow: { monthlyIncome: 45000, incomeAfterLoss: 15000, livingExpense: 15000, severance: 60000 },
  items: [
    { id: 'cash', category: 'checking', name: '存款', amount: 150000, currency: 'CNY' },
    { id: 'fund', category: 'fund', name: '基金', amount: 200000, currency: 'CNY' },
    { id: 'home', category: 'home', name: '自住房', amount: 3000000, currency: 'CNY' },
    {
      id: 'loan',
      category: 'mortgage',
      name: '房贷',
      amount: 1800000,
      currency: 'CNY',
      monthlyPayment: 12000,
      linkedAssetId: 'home',
    },
  ],
  ...overrides,
})

describe('summarize', () => {
  it('builds the balance sheet and ratios', () => {
    const result = summarize(snapshot())
    expect(result.totalAssets).toBe(3350000)
    expect(result.totalLiabilities).toBe(1800000)
    expect(result.netWorth).toBe(1550000)
    expect(result.monthlySurplus).toBe(18000)
    expect(result.savingsRate).toBeCloseTo(0.4)
  })

  it('counts new and legacy wallet and deposit categories as cash', () => {
    const items = ['wechatBalance', 'alipayBalance', 'wallet', 'deposit'].map((category) => ({
      id: category, category, name: category, amount: 100, currency: 'CNY' as const,
    }))
    const result = summarize(snapshot({ items }))
    expect(result.byGroup.cash).toBe(400)
    expect(result.netWorth).toBe(400)
  })

  it('files custom-named items under their group', () => {
    const s = snapshot({
      items: [
        { id: 'a', category: 'cashOther', name: '公司备用金', amount: 1000, currency: 'CNY' },
        { id: 'b', category: 'fixedOther', name: '收藏品', amount: 2000, currency: 'CNY' },
        { id: 'c', category: 'restrictedOther', name: '企业年金', amount: 3000, currency: 'CNY' },
      ],
    })
    const result = summarize(s)
    expect(result.byGroup.cash).toBe(1000)
    expect(result.byGroup.fixed).toBe(2000)
    expect(result.byGroup.restricted).toBe(3000)
    expect(result.liquidAssets).toBe(1000)
  })

  it('converts between currencies', () => {
    expect(toBase(100, 'USD', 'CNY', 7)).toBe(700)
    expect(toBase(700, 'CNY', 'USD', 7)).toBe(100)
    const usd = snapshot({ items: [{ id: 'a', category: 'stock', name: '美股', amount: 100, currency: 'USD' }] })
    expect(summarize(usd).totalAssets).toBe(700)
  })
})

describe('calculateCushion', () => {
  it('uses current cash and investments to cover recorded expenses and loan payments', () => {
    expect(calculateCushion(snapshot())).toEqual({ monthsCovered: 12, cashMonths: 5, capped: false })
  })

  it('ignores all future income, including rent and one-off compensation', () => {
    const draft = snapshot({
      items: [
        { id: 'cash', category: 'checking', name: 'Cash', amount: 12000, currency: 'CNY' },
        { id: 'stock', category: 'stock', name: 'Stock', amount: 3000, currency: 'USD' },
        { id: 'rent', category: 'rental', name: 'Rental', amount: 100000, currency: 'CNY', monthlyRent: 10000 },
        { id: 'loan', category: 'mortgage', name: 'Loan', amount: 50000, currency: 'CNY', monthlyPayment: 2000 },
      ],
      cashflow: { monthlyIncome: 30000, incomeAfterLoss: 10000, livingExpense: 6000, severance: 40000 },
    })
    expect(calculateCushion(draft)).toEqual({ monthsCovered: 4, cashMonths: 1, capped: false })
  })

  it('counts loan-only spending and distinguishes zero coverage from missing spending', () => {
    const cashflow = { monthlyIncome: 0, incomeAfterLoss: 0, livingExpense: 0, severance: 0 }
    expect(calculateCushion(snapshot({ items: [], cashflow }))).toBeNull()
    const loan = { id: 'loan', category: 'mortgage', name: 'Loan', amount: 10000, currency: 'CNY' as const, monthlyPayment: 1000 }
    expect(calculateCushion(snapshot({ items: [loan], cashflow }))).toEqual({ monthsCovered: 0, cashMonths: 0, capped: false })
  })

  it('keeps the display limit at sixty months', () => {
    const draft = snapshot()
    draft.items[0].amount = 50000000
    expect(calculateCushion(draft)).toEqual({ monthsCovered: 60, cashMonths: 60, capped: true })
  })

  it('does not lose a full month to decimal arithmetic', () => {
    const draft = snapshot({
      items: [{ id: 'cash', category: 'checking', name: 'Cash', amount: 0.3, currency: 'CNY' }],
      cashflow: { monthlyIncome: 0, incomeAfterLoss: 0, livingExpense: 0.1, severance: 0 },
    })
    expect(calculateCushion(draft)?.monthsCovered).toBe(3)
  })
})

describe('legacy estimate flags', () => {
  it('uses the same balances and safety cushion with or without the old flag', () => {
    const original = snapshot()
    const estimated = snapshot({ items: original.items.map((item) => ({ ...item, isEstimate: true })) })
    expect(summarize(estimated)).toEqual(summarize(original))
    expect(calculateCushion(estimated)).toEqual(calculateCushion(original))
  })
})

describe('legacy property links', () => {
  it('includes loan payments in the safety cushion regardless of the old property link', () => {
    const linked = snapshot()
    const unlinked = snapshot({ items: linked.items.map((item) => ({ ...item, linkedAssetId: undefined })) })
    expect(summarize(linked).monthlyDebtPayment).toBe(12000)
    expect(calculateCushion(linked)).toEqual(calculateCushion(unlinked))
  })
})

describe('diffSnapshots', () => {
  it('splits net worth change into balance and exchange rate', () => {
    const items = [{ id: 'a', category: 'stock', name: '美股', amount: 100, currency: 'USD' as const }]
    const previous = snapshot({ usdCny: 7, items })
    const current = snapshot({ usdCny: 6.5, items: [{ ...items[0]!, amount: 120 }] })
    const diff = diffSnapshots(previous, current)
    expect(diff.netWorthChange).toBeCloseTo(780 - 700)
    expect(diff.fxChange).toBeCloseTo(-60)
    expect(diff.balanceChange).toBeCloseTo(140)
  })
})

describe('flows', () => {
  it('folds income and expense lines into the monthly summary', () => {
    const result = deriveCashflow(
      [
        { id: '1', category: 'salary', name: '工资', amount: 30000, currency: 'CNY', frequency: 'monthly', continues: true },
        { id: '2', category: 'yearBonus', name: '年终奖', amount: 120000, currency: 'CNY', frequency: 'annual' },
        { id: '3', category: 'familySalary', name: '配偶', amount: 1000, currency: 'USD', frequency: 'monthly', continues: false },
        { id: '4', category: 'severancePay', name: '补偿', amount: 60000, currency: 'CNY', frequency: 'once', continues: true },
        { id: '5', category: 'living', name: '生活', amount: 12000, currency: 'CNY', frequency: 'monthly' },
        { id: '6', category: 'carInsurance', name: '车险', amount: 6000, currency: 'CNY', frequency: 'annual' },
      ],
      'CNY',
      7,
    )
    expect(result.monthlyIncome).toBe(30000 + 10000 + 7000)
    expect(result.incomeAfterLoss).toBe(7000)
    expect(result.severance).toBe(60000)
    expect(result.livingExpense).toBe(12500)
  })

  it('migrates the old summary into lines and back', () => {
    let next = 0
    const cashflow = { monthlyIncome: 45000, incomeAfterLoss: 15000, livingExpense: 15000, severance: 60000 }
    const flows = flowsFromCashflow(cashflow, 'CNY', () => String(next++))
    expect(flows).toHaveLength(4)
    expect(deriveCashflow(flows, 'CNY', 7)).toEqual(cashflow)
  })
})

describe('yearly headline tier', () => {
  it.each([
    [0, 'tight'],
    [2, 'tight'],
    [3, 'tight'],
    [5, 'tight'],
    [6, 'moderate'],
    [11, 'moderate'],
    [12, 'ample'],
    [23, 'ample'],
    [24, 'veryAmple'],
  ])('classifies %i months as %s', (monthsCovered, tier) => {
    expect(yearlyHeadlineTier(monthsCovered, 0)).toBe(tier)
  })

  it('uses the negative headline regardless of available spending data or coverage', () => {
    expect(yearlyHeadlineTier(60, -1)).toBe('negative')
    expect(yearlyHeadlineTier(null, -1)).toBe('negative')
    expect(yearlyHeadlineTier(null, 0)).toBeNull()
  })

})
