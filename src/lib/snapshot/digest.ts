import { coverageRange, diffSnapshots, ratingOf, simulate, summarize, type Snapshot } from '@/engine'

/** The figures an agent needs to describe a review in conversation, computed by the same engine as the page. */
export function digest(snapshot: Snapshot, previous?: Snapshot) {
  const summary = summarize(snapshot)
  const stress = simulate(snapshot)
  const range = coverageRange(snapshot)
  const round = (value: number) => Math.round(value)
  const percent = (value: number) => Math.round(value * 1000) / 10
  const diff = previous ? diffSnapshots(previous, snapshot) : null
  return {
    date: snapshot.date,
    period: snapshot.period,
    scope: snapshot.scope,
    currency: snapshot.baseCurrency,
    usdCny: snapshot.usdCny,
    netWorth: round(summary.netWorth),
    totalAssets: round(summary.totalAssets),
    totalLiabilities: round(summary.totalLiabilities),
    byGroup: Object.fromEntries(Object.entries(summary.byGroup).map(([group, value]) => [group, round(value)])),
    liquidSharePercent: percent(summary.liquidRatio),
    monthlyIncome: round(snapshot.cashflow.monthlyIncome),
    monthlyExpense: round(snapshot.cashflow.livingExpense),
    monthlyDebtPayment: round(summary.monthlyDebtPayment),
    monthlySurplus: round(summary.monthlySurplus),
    savingsRatePercent: percent(summary.savingsRate),
    debtToIncomePercent: percent(summary.debtRatio),
    safetyCushion: {
      sustainable: stress.sustainable,
      months: stress.capped ? '60+' : stress.monthsCovered,
      range: range.isRange ? [range.low, range.high] : null,
      rating: ratingOf(stress),
    },
    sincePrevious: diff && previous ? { previousDate: previous.date, netWorthChange: round(diff.netWorthChange), fromExchangeRate: round(diff.fxChange), cushionMonthsChange: diff.monthsCoveredChange } : null,
  }
}
