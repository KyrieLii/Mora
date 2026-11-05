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
  /** An older category kept for reading saved reviews. */
  legacy?: boolean
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
  { id: 'wechatBalance', label: '微信零钱', group: 'cash' },
  { id: 'alipayBalance', label: '支付宝余额', group: 'cash' },
  { id: 'wallet', label: '微信支付宝余额', group: 'cash', legacy: true },
  { id: 'mmf', label: '货币基金', group: 'cash' },
  { id: 'deposit', label: '定期存款', group: 'cash', legacy: true },
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
  /** Legacy flag retained for compatibility with saved snapshots. */
  isEstimate?: boolean
  monthlyPayment?: number
  /** Legacy mortgage link retained for compatibility with saved snapshots. */
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
  legacy?: boolean
  generic?: boolean
}

export const FLOW_CATEGORIES: FlowCategoryDef[] = [
  { id: 'salary', label: '月薪', kind: 'income', frequency: 'monthly' },
  { id: 'familySalary', label: '月薪-家人', kind: 'income', frequency: 'monthly', continues: true },
  { id: 'quarterBonus', label: '季度奖金', kind: 'income', frequency: 'quarterly' },
  { id: 'yearBonus', label: '年终奖', kind: 'income', frequency: 'annual' },
  { id: 'severancePay', label: '一次性补偿', kind: 'income', frequency: 'once' },
  { id: 'familyIncome', label: '家人收入', kind: 'income', frequency: 'monthly', continues: true, legacy: true },
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
  /** Legacy override. Calculations now use the income category. */
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
 * Folds income and expense lines into monthly totals. Legacy subtotals remain in saved reviews.
 */
export function deriveCashflow(flows: FlowItem[], base: Currency, usdCny: number): Cashflow {
  const cashflow: Cashflow = { monthlyIncome: 0, incomeAfterLoss: 0, livingExpense: 0, severance: 0 }
  for (const flow of flows) {
    const monthly = monthlyEquivalent(flow, base, usdCny)
    const category = FLOW_CATEGORIES.find((entry) => entry.id === flow.category)
    if (category?.kind !== 'income') {
      cashflow.livingExpense += monthly
      continue
    }
    if (flow.frequency === 'once') cashflow.severance += toBase(flow.amount, flow.currency, base, usdCny)
    cashflow.monthlyIncome += monthly
    if (category.continues) cashflow.incomeAfterLoss += monthly
  }
  return cashflow
}

/** Turns an older snapshot's four summary numbers into editable lines. */
export function flowsFromCashflow(cashflow: Cashflow, currency: Currency, makeId: () => string): FlowItem[] {
  const lines: FlowItem[] = []
  const add = (category: string, name: string, amount: number, frequency: Frequency) =>
    amount > 0 && lines.push({ id: makeId(), category, name, amount, currency, frequency })
  add('salary', '月薪', cashflow.monthlyIncome - cashflow.incomeAfterLoss, 'monthly')
  add('familyIncome', '家人收入', cashflow.incomeAfterLoss, 'monthly')
  add('severancePay', '一次性补偿', cashflow.severance, 'once')
  add('living', '生活开销', cashflow.livingExpense, 'monthly')
  return lines
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

export interface SafetyCushion {
  monthsCovered: number
  cashMonths: number
  capped: boolean
}

/** Counts full months covered by current cash and investments with no further income. */
export function calculateCushion(s: Snapshot, summary = summarize(s)): SafetyCushion | null {
  const monthlySpending = s.cashflow.livingExpense + summary.monthlyDebtPayment
  if (monthlySpending <= 0) return null

  const coveredMonths = (balance: number) => {
    const months = Math.min(MAX_MONTHS, balance / monthlySpending)
    return Math.floor(months + Number.EPSILON * Math.max(1, months))
  }
  const monthsCovered = coveredMonths(summary.liquidAssets)
  return { monthsCovered, cashMonths: coveredMonths(summary.byGroup.cash), capped: monthsCovered === MAX_MONTHS }
}

export function ratingOf(monthsCovered: number): Rating {
  if (monthsCovered >= 12) return 'ample'
  return monthsCovered >= 6 ? 'moderate' : 'tight'
}

export const RATING_LABELS: Record<Rating, string> = {
  tight: '安全垫偏薄',
  moderate: '安全垫适中',
  ample: '安全垫充足',
}

/** Negative net worth takes precedence over the annual card's coverage tiers. */
export function yearlyHeadlineTier(monthsCovered: number | null, netWorth: number): Rating | 'negative' | 'veryAmple' | null {
  if (netWorth < 0) return 'negative'
  if (monthsCovered === null) return null
  return monthsCovered >= 24 ? 'veryAmple' : ratingOf(monthsCovered)
}

export interface SnapshotDiff {
  netWorthChange: number
  balanceChange: number
  fxChange: number
  cashChange: number
  liabilityChange: number
  monthsCoveredChange: number | null
}

export function diffSnapshots(previous: Snapshot, current: Snapshot): SnapshotDiff {
  const before = summarize({ ...previous, baseCurrency: current.baseCurrency })
  const after = summarize(current)
  const atOldRate = summarize({ ...current, usdCny: previous.usdCny })
  const netWorthChange = after.netWorth - before.netWorth
  const fxChange = after.netWorth - atOldRate.netWorth
  const previousCushion = calculateCushion(previous)
  const currentCushion = calculateCushion(current, after)
  return {
    netWorthChange,
    balanceChange: netWorthChange - fxChange,
    fxChange,
    cashChange: after.byGroup.cash - before.byGroup.cash,
    liabilityChange: after.totalLiabilities - before.totalLiabilities,
    monthsCoveredChange: currentCushion && previousCushion ? currentCushion.monthsCovered - previousCushion.monthsCovered : null,
  }
}
