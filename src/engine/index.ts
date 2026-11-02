export type Currency = 'CNY' | 'USD'
export type Group = 'cash' | 'investment' | 'fixed' | 'restricted' | 'other' | 'liability'
export type Period = 'quarter' | 'year'
export type Scope = 'personal' | 'family'
export type Rating = 'tight' | 'moderate' | 'ample'

export interface CategoryDef {
  id: string
  label: string
  group: Group
  /** The catch-all category a user-named item is filed under. */
  generic?: boolean
}

export const GROUPS: { id: Group; label: string }[] = [
  { id: 'cash', label: '现金类' },
  { id: 'investment', label: '投资类' },
  { id: 'fixed', label: '固定资产' },
  { id: 'restricted', label: '受限资产' },
  { id: 'other', label: '其他资产' },
  { id: 'liability', label: '负债' },
]

export const CATEGORIES: CategoryDef[] = [
  { id: 'checking', label: '银行存款', group: 'cash' },
  { id: 'wallet', label: '微信支付宝余额', group: 'cash' },
  { id: 'mmf', label: '货币基金', group: 'cash' },
  { id: 'deposit', label: '定期存款', group: 'cash' },
  { id: 'cashOther', label: '其他现金', group: 'cash', generic: true },
  { id: 'stock', label: '股票', group: 'investment' },
  { id: 'fund', label: '基金', group: 'investment' },
  { id: 'bond', label: '债券理财', group: 'investment' },
  { id: 'crypto', label: '加密资产', group: 'investment' },
  { id: 'investOther', label: '其他投资', group: 'investment', generic: true },
  { id: 'home', label: '自住房', group: 'fixed' },
  { id: 'rental', label: '投资房', group: 'fixed' },
  { id: 'parking', label: '车位', group: 'fixed' },
  { id: 'car', label: '车辆', group: 'fixed' },
  { id: 'fixedOther', label: '其他固定资产', group: 'fixed', generic: true },
  { id: 'hpf', label: '公积金', group: 'restricted' },
  { id: 'pension', label: '个人养老金', group: 'restricted' },
  { id: 'policy', label: '保单现金价值', group: 'restricted' },
  { id: 'restrictedOther', label: '其他受限资产', group: 'restricted', generic: true },
  { id: 'loaned', label: '借出款', group: 'other' },
  { id: 'equity', label: '公司股权', group: 'other' },
  { id: 'otherAsset', label: '其他资产', group: 'other', generic: true },
  { id: 'mortgage', label: '房贷', group: 'liability' },
  { id: 'carLoan', label: '车贷', group: 'liability' },
  { id: 'consumerLoan', label: '消费贷', group: 'liability' },
  { id: 'businessLoan', label: '经营贷', group: 'liability' },
  { id: 'creditCard', label: '信用卡', group: 'liability' },
  { id: 'familyLoan', label: '亲友借款', group: 'liability' },
  { id: 'otherDebt', label: '其他负债', group: 'liability', generic: true },
]

const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]))

export function groupOf(categoryId: string): Group {
  return CATEGORY_BY_ID.get(categoryId)?.group ?? 'other'
}

export interface Item {
  id: string
  category: string
  name: string
  amount: number
  currency: Currency
  isEstimate?: boolean
  monthlyPayment?: number
  linkedAssetId?: string
  monthlyRent?: number
}

export interface Cashflow {
  monthlyIncome: number
  incomeAfterLoss: number
  livingExpense: number
  severance: number
}

export interface Snapshot {
  id: string
  date: string
  period: Period
  scope: Scope
  baseCurrency: Currency
  usdCny: number
  fxDate: string
  items: Item[]
  /** Derived from flows when they exist; kept as the engine's monthly summary. */
  cashflow: Cashflow
  /** Editable income and expense lines; newer snapshots carry these. */
  flows?: FlowItem[]
  insurance: string[]
}

export type FlowKind = 'income' | 'expense'
export type Frequency = 'monthly' | 'quarterly' | 'annual' | 'once'

export interface FlowCategoryDef {
  id: string
  label: string
  kind: FlowKind
  frequency: Frequency
  /** Income that keeps arriving after the main earner's pay stops. */
  continues?: boolean
  generic?: boolean
}

export const FLOW_CATEGORIES: FlowCategoryDef[] = [
  { id: 'salary', label: '工资收入', kind: 'income', frequency: 'monthly' },
  { id: 'quarterBonus', label: '季度奖金', kind: 'income', frequency: 'quarterly' },
  { id: 'yearBonus', label: '年终奖', kind: 'income', frequency: 'annual' },
  { id: 'severancePay', label: '一次性补偿', kind: 'income', frequency: 'once' },
  { id: 'familyIncome', label: '家人收入', kind: 'income', frequency: 'monthly', continues: true },
  { id: 'incomeOther', label: '其他收入', kind: 'income', frequency: 'monthly', generic: true },
  { id: 'living', label: '生活开销', kind: 'expense', frequency: 'monthly' },
  { id: 'rent', label: '房租', kind: 'expense', frequency: 'monthly' },
  { id: 'propertyFee', label: '物业费', kind: 'expense', frequency: 'monthly' },
  { id: 'carInsurance', label: '车险', kind: 'expense', frequency: 'annual' },
  { id: 'premium', label: '保险保费', kind: 'expense', frequency: 'annual' },
  { id: 'subscription', label: '订阅费', kind: 'expense', frequency: 'monthly' },
  { id: 'education', label: '教育支出', kind: 'expense', frequency: 'monthly' },
  { id: 'expenseOther', label: '其他支出', kind: 'expense', frequency: 'monthly', generic: true },
]

export interface FlowItem {
  id: string
  category: string
  name: string
  amount: number
  currency: Currency
  frequency: Frequency
  continues?: boolean
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: '每月',
  quarterly: '每季',
  annual: '每年',
  once: '一次性',
}

const MONTHS_PER: Record<Frequency, number> = { monthly: 1, quarterly: 3, annual: 12, once: Infinity }

export function flowKind(categoryId: string): FlowKind {
  return FLOW_CATEGORIES.find((entry) => entry.id === categoryId)?.kind ?? 'expense'
}

/** What a line is worth per month; one-off amounts are not monthly. */
export function monthlyEquivalent(flow: FlowItem, base: Currency, usdCny: number) {
  return flow.frequency === 'once' ? 0 : toBase(flow.amount, flow.currency, base, usdCny) / MONTHS_PER[flow.frequency]
}

/**
 * Folds income and expense lines into the monthly summary the stress model reads.
 * One-off income (such as a severance payment) arrives as cash when income stops.
 */
export function deriveCashflow(flows: FlowItem[], base: Currency, usdCny: number): Cashflow {
  const cashflow: Cashflow = { monthlyIncome: 0, incomeAfterLoss: 0, livingExpense: 0, severance: 0 }
  for (const flow of flows) {
    const monthly = monthlyEquivalent(flow, base, usdCny)
    if (flowKind(flow.category) === 'expense') {
      cashflow.livingExpense += monthly
      continue
    }
    if (flow.frequency === 'once') cashflow.severance += toBase(flow.amount, flow.currency, base, usdCny)
    cashflow.monthlyIncome += monthly
    if (flow.continues) cashflow.incomeAfterLoss += monthly
  }
  return cashflow
}

/** Turns an older snapshot's four summary numbers into editable lines. */
export function flowsFromCashflow(cashflow: Cashflow, currency: Currency, makeId: () => string): FlowItem[] {
  const lines: FlowItem[] = []
  const add = (category: string, name: string, amount: number, frequency: Frequency, continues?: boolean) =>
    amount > 0 && lines.push({ id: makeId(), category, name, amount, currency, frequency, continues })
  add('salary', '工资收入', cashflow.monthlyIncome - cashflow.incomeAfterLoss, 'monthly')
  add('familyIncome', '家人收入', cashflow.incomeAfterLoss, 'monthly', true)
  add('severancePay', '一次性补偿', cashflow.severance, 'once')
  add('living', '生活开销', cashflow.livingExpense, 'monthly')
  return lines
}

export interface StressParams {
  stockDrop: number
  cryptoDrop: number
  homeDrop: number
  saleCost: number
  saleLeadMonths: number
  rentYield: number
  expenseCut: number
  socialSecurityCny: number
  benefitMonthly: number
  benefitMonths: number
}

export const DEFAULT_STRESS: StressParams = {
  stockDrop: 0.3,
  cryptoDrop: 0.5,
  homeDrop: 0.2,
  saleCost: 0.03,
  saleLeadMonths: 6,
  rentYield: 0.02,
  expenseCut: 0.15,
  socialSecurityCny: 1500,
  benefitMonthly: 0,
  benefitMonths: 12,
}

export const MAX_MONTHS = 60

export function toBase(amount: number, currency: Currency, base: Currency, usdCny: number): number {
  if (currency === base) return amount
  return currency === 'USD' ? amount * usdCny : amount / usdCny
}

const itemValue = (item: Item, s: Pick<Snapshot, 'baseCurrency' | 'usdCny'>) =>
  toBase(item.amount, item.currency, s.baseCurrency, s.usdCny)

const paymentValue = (item: Item, s: Snapshot) =>
  toBase(item.monthlyPayment ?? 0, item.currency, s.baseCurrency, s.usdCny)

const rentValue = (item: Item, s: Snapshot) =>
  toBase(item.monthlyRent ?? 0, item.currency, s.baseCurrency, s.usdCny)

export interface BalanceSummary {
  byGroup: Record<Group, number>
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  liquidAssets: number
  liquidRatio: number
  monthlyDebtPayment: number
  monthlySurplus: number
  savingsRate: number
  debtRatio: number
}

export function summarize(s: Snapshot): BalanceSummary {
  const byGroup: Record<Group, number> = { cash: 0, investment: 0, fixed: 0, restricted: 0, other: 0, liability: 0 }
  for (const item of s.items) byGroup[groupOf(item.category)] += itemValue(item, s)
  const totalLiabilities = byGroup.liability
  const totalAssets = byGroup.cash + byGroup.investment + byGroup.fixed + byGroup.restricted + byGroup.other
  const liquidAssets = byGroup.cash + byGroup.investment
  const monthlyDebtPayment = s.items.reduce((sum, item) => sum + paymentValue(item, s), 0)
  const monthlyRent = s.items.reduce((sum, item) => sum + rentValue(item, s), 0)
  const income = s.cashflow.monthlyIncome + monthlyRent
  const monthlySurplus = income - s.cashflow.livingExpense - monthlyDebtPayment
  return {
    byGroup,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    liquidAssets,
    liquidRatio: totalAssets > 0 ? liquidAssets / totalAssets : 0,
    monthlyDebtPayment,
    monthlySurplus,
    savingsRate: income > 0 ? monthlySurplus / income : 0,
    debtRatio: income > 0 ? monthlyDebtPayment / income : 0,
  }
}

interface StressPool {
  cash: number
  investments: number
}

function buildPool(s: Snapshot, p: StressParams, stockDrop: number, estimateScale: number): StressPool {
  let cash = s.cashflow.severance
  let investments = 0
  for (const item of s.items) {
    const group = groupOf(item.category)
    const value = itemValue(item, s) * (item.isEstimate ? estimateScale : 1)
    if (group === 'cash') cash += value
    if (group === 'investment') investments += value * (1 - (item.category === 'crypto' ? p.cryptoDrop : stockDrop))
  }
  return { cash, investments }
}

function monthlyFlows(s: Snapshot, p: StressParams) {
  const social = toBase(p.socialSecurityCny, 'CNY', s.baseCurrency, s.usdCny)
  const debt = s.items.reduce((sum, item) => sum + paymentValue(item, s), 0)
  const rent = s.items.reduce((sum, item) => sum + rentValue(item, s), 0)
  const spend = s.cashflow.livingExpense * (1 - p.expenseCut) + debt + social
  const baseIncome = s.cashflow.incomeAfterLoss + rent
  const incomeAt = (month: number) => baseIncome + (month <= p.benefitMonths ? p.benefitMonthly : 0)
  return { spend, incomeAt }
}

/** Draws one month from the pool and returns the part that could not be funded. */
function draw(pool: StressPool, gap: number) {
  const fromCash = Math.min(pool.cash, gap)
  pool.cash -= fromCash
  const fromInvestments = Math.min(pool.investments, gap - fromCash)
  pool.investments -= fromInvestments
  return { usedInvestments: fromInvestments > 0, unfunded: gap - fromCash - fromInvestments }
}

export interface StressResult {
  sustainable: boolean
  capped: boolean
  monthsCovered: number
  exhaustedMonth: number | null
  sellInvestmentsMonth: number | null
  firstGap: number
  laterGap: number
}

function runSimulation(s: Snapshot, p: StressParams, estimateScale: number): StressResult {
  const { spend, incomeAt } = monthlyFlows(s, p)
  const pool = buildPool(s, p, p.stockDrop, estimateScale)
  const firstGap = Math.max(0, spend - incomeAt(1))
  const laterGap = Math.max(0, spend - incomeAt(p.benefitMonths + 1))
  let sellInvestmentsMonth: number | null = null
  let exhaustedMonth: number | null = null
  for (let month = 1; month <= MAX_MONTHS; month++) {
    const net = incomeAt(month) - spend
    if (net >= 0) {
      pool.cash += net
      continue
    }
    const { usedInvestments, unfunded } = draw(pool, -net)
    if (usedInvestments && sellInvestmentsMonth === null) sellInvestmentsMonth = month
    if (unfunded > 0) {
      exhaustedMonth = month
      break
    }
  }
  return {
    sustainable: laterGap === 0,
    capped: exhaustedMonth === null,
    monthsCovered: exhaustedMonth === null ? MAX_MONTHS : exhaustedMonth - 1,
    exhaustedMonth,
    sellInvestmentsMonth,
    firstGap,
    laterGap,
  }
}

export function simulate(s: Snapshot, params: Partial<StressParams> = {}): StressResult {
  return runSimulation(s, { ...DEFAULT_STRESS, ...params }, 1)
}

/** Estimated items move ±20%, which turns the single answer into a range. */
export function coverageRange(s: Snapshot, params: Partial<StressParams> = {}) {
  const p = { ...DEFAULT_STRESS, ...params }
  const low = runSimulation(s, p, 0.8).monthsCovered
  const high = runSimulation(s, p, 1.2).monthsCovered
  return { low, high, isRange: low !== high }
}

export function ratingOf(result: StressResult): Rating {
  if (result.sustainable || result.monthsCovered >= 12) return 'ample'
  return result.monthsCovered >= 6 ? 'moderate' : 'tight'
}

export const RATING_LABELS: Record<Rating, string> = {
  tight: '安全垫偏薄',
  moderate: '安全垫适中',
  ample: '安全垫充足',
}

export interface MatrixCell {
  months: number
  drop: number
  shortfall: number
}

export function scenarioMatrix(
  s: Snapshot,
  params: Partial<StressParams> = {},
  durations = [3, 6, 12, 24],
  drops = [0, 0.2, 0.3, 0.5],
): MatrixCell[][] {
  const p = { ...DEFAULT_STRESS, ...params }
  const { spend, incomeAt } = monthlyFlows(s, p)
  return durations.map((months) =>
    drops.map((drop) => {
      const pool = buildPool(s, p, drop, 1)
      let shortfall = 0
      for (let month = 1; month <= months; month++) {
        const net = incomeAt(month) - spend
        if (net >= 0) pool.cash += net
        else shortfall += draw(pool, -net).unfunded
      }
      return { months, drop, shortfall }
    }),
  )
}

export interface PropertyResult {
  id: string
  name: string
  netProceeds: number
  latestListingMonth: number | null
  gapAfterSale: number
  extraMonths: number | null
  breakEvenDrop: number
}

export function propertyAnalysis(s: Snapshot, params: Partial<StressParams> = {}): PropertyResult[] {
  const p = { ...DEFAULT_STRESS, ...params }
  const stress = runSimulation(s, p, 1)
  return s.items
    .filter((item) => item.category === 'home' || item.category === 'rental')
    .map((property) => {
      const value = itemValue(property, s)
      const loans = s.items.filter((item) => item.linkedAssetId === property.id)
      const balance = loans.reduce((sum, loan) => sum + itemValue(loan, s), 0)
      const payment = loans.reduce((sum, loan) => sum + paymentValue(loan, s), 0)
      const netProceeds = value * (1 - p.homeDrop) * (1 - p.saleCost) - balance
      const newRent = property.category === 'home' ? (value * p.rentYield) / 12 : 0
      const gapAfterSale = Math.max(0, stress.laterGap - payment - rentValue(property, s) + newRent)
      const extraMonths = netProceeds <= 0 ? 0 : gapAfterSale === 0 ? null : Math.floor(netProceeds / gapAfterSale)
      return {
        id: property.id,
        name: property.name,
        netProceeds,
        latestListingMonth:
          stress.exhaustedMonth === null ? null : Math.max(1, stress.exhaustedMonth - p.saleLeadMonths),
        gapAfterSale,
        extraMonths,
        breakEvenDrop: value > 0 ? 1 - balance / (value * (1 - p.saleCost)) : 0,
      }
    })
}

/** Ordered by how directly each one shortens the buffer; the report shows the first two. */
export function insights(s: Snapshot, params: Partial<StressParams> = {}): string[] {
  const summary = summarize(s)
  const stress = simulate(s, params)
  const notes: string[] = []
  if (stress.firstGap > 0 && summary.byGroup.cash + s.cashflow.severance < stress.firstGap * 3) {
    notes.push('现金不足以覆盖 3 个月缺口')
  }
  if (s.cashflow.incomeAfterLoss === 0) notes.push('主要收入中断后，家庭没有其他工资收入')
  if (summary.debtRatio >= 0.3) notes.push('还贷已达到税后收入的 30%')
  if (summary.liquidAssets > 0 && summary.byGroup.investment / summary.liquidAssets > 0.5) {
    notes.push('流动资产中，股票、基金等投资占比超过一半')
  }
  if (summary.totalAssets > 0 && summary.liquidRatio < 0.2) notes.push('流动资产不足总资产的 20%，资产集中在固定资产')
  if (s.insurance.includes('none') || s.insurance.includes('unknown')) notes.push('主要收入者的保障信息不完整')
  return notes
}

export interface SnapshotDiff {
  netWorthChange: number
  balanceChange: number
  fxChange: number
  cashChange: number
  liabilityChange: number
  monthsCoveredChange: number
}

export function diffSnapshots(previous: Snapshot, current: Snapshot, params: Partial<StressParams> = {}): SnapshotDiff {
  const before = summarize({ ...previous, baseCurrency: current.baseCurrency })
  const after = summarize(current)
  const atOldRate = summarize({ ...current, usdCny: previous.usdCny })
  const netWorthChange = after.netWorth - before.netWorth
  const fxChange = after.netWorth - atOldRate.netWorth
  return {
    netWorthChange,
    balanceChange: netWorthChange - fxChange,
    fxChange,
    cashChange: after.byGroup.cash - before.byGroup.cash,
    liabilityChange: after.totalLiabilities - before.totalLiabilities,
    monthsCoveredChange: simulate(current, params).monthsCovered - simulate(previous, params).monthsCovered,
  }
}
