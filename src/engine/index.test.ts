import { describe, expect, it } from 'vitest'
import {
  coverageRange,
  deriveCashflow,
  flowsFromCashflow,
  diffSnapshots,
  insights,
  propertyAnalysis,
  ratingOf,
  scenarioMatrix,
  simulate,
  summarize,
  toBase,
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

// The expense cut is 12% so living costs match the 13,200 used in the worked example.
const example = { expenseCut: 0.12, benefitMonthly: 2000 }

describe('summarize', () => {
  it('builds the balance sheet and ratios', () => {
    const result = summarize(snapshot())
    expect(result.totalAssets).toBe(3350000)
    expect(result.totalLiabilities).toBe(1800000)
    expect(result.netWorth).toBe(1550000)
    expect(result.monthlySurplus).toBe(18000)
    expect(result.savingsRate).toBeCloseTo(0.4)
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

describe('simulate', () => {
  it('reproduces the single-income example', () => {
    const result = simulate(snapshot(), example)
    expect(result.firstGap).toBe(9700)
    expect(result.laterGap).toBe(11700)
    expect(result.sellInvestmentsMonth).toBe(21)
    expect(result.exhaustedMonth).toBe(32)
    expect(result.monthsCovered).toBe(31)
  })

  it('reproduces the two-income loss example', () => {
    const s = snapshot({
      cashflow: { monthlyIncome: 45000, incomeAfterLoss: 0, livingExpense: 15000, severance: 90000 },
    })
    const result = simulate(s, { ...example, benefitMonthly: 4000, socialSecurityCny: 3000 })
    expect(result.firstGap).toBe(24200)
    expect(result.laterGap).toBe(28200)
    expect(result.sellInvestmentsMonth).toBe(10)
    expect(result.exhaustedMonth).toBe(16)
  })

  it('reports households that income can still cover', () => {
    const s = snapshot({ cashflow: { monthlyIncome: 45000, incomeAfterLoss: 40000, livingExpense: 15000, severance: 0 } })
    const result = simulate(s)
    expect(result.sustainable).toBe(true)
    expect(ratingOf(result)).toBe('ample')
  })

  it('caps long coverage at the simulation limit', () => {
    const rich = snapshot()
    rich.items[0].amount = 50000000
    const result = simulate(rich)
    expect(result.capped).toBe(true)
    expect(result.monthsCovered).toBe(60)
  })

  it('includes crypto at its own drop', () => {
    const s = snapshot({
      cashflow: { monthlyIncome: 45000, incomeAfterLoss: 0, livingExpense: 15000, severance: 60000 },
      items: [{ id: 'c', category: 'crypto', name: 'BTC', amount: 100000, currency: 'CNY' }],
    })
    const result = simulate(s, { cryptoDrop: 0.5, stockDrop: 0 })
    expect(result.monthsCovered).toBe(Math.floor((50000 + 60000) / result.firstGap))
  })
})

describe('coverageRange', () => {
  it('is exact when nothing is estimated', () => {
    expect(coverageRange(snapshot()).isRange).toBe(false)
  })

  it('widens when an amount is estimated', () => {
    const s = snapshot()
    s.items[0].isEstimate = true
    const range = coverageRange(s)
    expect(range.isRange).toBe(true)
    expect(range.low).toBeLessThan(range.high)
  })
})

describe('scenarioMatrix', () => {
  it('reports the shortfall for a failing cell', () => {
    const s = snapshot({ items: [{ id: 'c', category: 'checking', name: '存款', amount: 1000, currency: 'CNY' }] })
    s.cashflow = { monthlyIncome: 0, incomeAfterLoss: 0, livingExpense: 10000, severance: 0 }
    const [cell] = scenarioMatrix(s, { expenseCut: 0, socialSecurityCny: 0 }, [3], [0])[0]!.slice(0, 1)
    expect(cell!.shortfall).toBe(29000)
  })
})

describe('propertyAnalysis', () => {
  const twoIncomeLoss = () =>
    snapshot({ cashflow: { monthlyIncome: 45000, incomeAfterLoss: 0, livingExpense: 15000, severance: 90000 } })
  const params = { ...example, benefitMonthly: 4000, socialSecurityCny: 3000 }

  it('computes proceeds, deadline and extension', () => {
    const [home] = propertyAnalysis(twoIncomeLoss(), params)
    expect(home!.netProceeds).toBeCloseTo(528000)
    expect(home!.latestListingMonth).toBe(10)
    expect(home!.gapAfterSale).toBeCloseTo(21200)
    expect(home!.extraMonths).toBe(24)
    expect(home!.breakEvenDrop).toBeCloseTo(0.381, 3)
  })

  it('adds no months when the sale leaves nothing', () => {
    const [home] = propertyAnalysis(twoIncomeLoss(), { ...params, homeDrop: 0.4 })
    expect(home!.netProceeds).toBeCloseTo(-54000)
    expect(home!.extraMonths).toBe(0)
  })
})

describe('insights', () => {
  it('flags the household weak points', () => {
    const s = snapshot({
      insurance: ['none'],
      cashflow: { monthlyIncome: 30000, incomeAfterLoss: 0, livingExpense: 15000, severance: 0 },
      items: [
        { id: 'a', category: 'checking', name: '存款', amount: 20000, currency: 'CNY' },
        { id: 'b', category: 'stock', name: '股票', amount: 80000, currency: 'CNY' },
        { id: 'c', category: 'home', name: '自住房', amount: 3000000, currency: 'CNY' },
        { id: 'd', category: 'mortgage', name: '房贷', amount: 1000000, currency: 'CNY', monthlyPayment: 12000 },
      ],
    })
    expect(insights(s)).toHaveLength(6)
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
        { id: '1', category: 'salary', name: '工资', amount: 30000, currency: 'CNY', frequency: 'monthly' },
        { id: '2', category: 'yearBonus', name: '年终奖', amount: 120000, currency: 'CNY', frequency: 'annual' },
        { id: '3', category: 'familyIncome', name: '配偶', amount: 1000, currency: 'USD', frequency: 'monthly', continues: true },
        { id: '4', category: 'severancePay', name: '补偿', amount: 60000, currency: 'CNY', frequency: 'once' },
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
