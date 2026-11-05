import type { FlowItem, Item, Snapshot } from '@/engine'

const items: Item[] = [
  { id: 'cmb', category: 'checking', name: '招商银行-工资卡', amount: 120000, currency: 'CNY' },
  { id: 'yeb', category: 'mmf', name: '余额宝', amount: 80000, currency: 'CNY' },
  { id: 'futu', category: 'stock', name: '富途-美股', amount: 28000, currency: 'USD' },
  { id: 'alipay', category: 'fund', name: '支付宝-基金', amount: 180000, currency: 'CNY' },
  { id: 'home', category: 'home', name: '自住房', amount: 3000000, currency: 'CNY' },
  { id: 'hpf', category: 'hpf', name: '夫妻公积金', amount: 160000, currency: 'CNY' },
  {
    id: 'mortgage',
    category: 'mortgage',
    name: '自住房房贷',
    amount: 1800000,
    currency: 'CNY',
    monthlyPayment: 12000,
  },
  { id: 'card', category: 'creditCard', name: '信用卡待还', amount: 12000, currency: 'CNY' },
]

const flows: FlowItem[] = [
  { id: 'pay', category: 'salary', name: '我的工资', amount: 30000, currency: 'CNY', frequency: 'monthly' },
  { id: 'partner', category: 'familySalary', name: '配偶工资', amount: 15000, currency: 'CNY', frequency: 'monthly' },
  { id: 'severance', category: 'severancePay', name: '离职补偿（估）', amount: 60000, currency: 'CNY', frequency: 'once' },
  { id: 'living', category: 'living', name: '生活开销', amount: 13500, currency: 'CNY', frequency: 'monthly' },
  { id: 'car', category: 'carInsurance', name: '车险', amount: 6000, currency: 'CNY', frequency: 'annual' },
  { id: 'subs', category: 'subscription', name: '视频和云盘会员', amount: 1000, currency: 'CNY', frequency: 'monthly' },
]

export const samplePrevious: Snapshot = {
  id: 'sample-q3',
  date: '2026-09-30',
  period: 'quarter',
  scope: 'family',
  baseCurrency: 'CNY',
  usdCny: 6.72,
  fxDate: '2026-09-30',
  insurance: ['medical'],
  cashflow: { monthlyIncome: 45000, incomeAfterLoss: 15000, livingExpense: 15000, severance: 60000 },
  flows,
  items: items.map((item) => {
    if (item.id === 'cmb') return { ...item, amount: 95000 }
    if (item.id === 'futu') return { ...item, amount: 25000 }
    if (item.id === 'mortgage') return { ...item, amount: 1824000 }
    return item
  }),
}

/** About a year earlier, so the sample shows a three-point trend and a 同比 change. Fictional like the rest. */
export const sampleYearAgo: Snapshot = {
  ...samplePrevious,
  id: 'sample-year-ago',
  date: '2025-11-08',
  usdCny: 7.12,
  fxDate: '2025-11-07',
  items: samplePrevious.items.map((item) => {
    if (item.id === 'cmb') return { ...item, amount: 62000 }
    if (item.id === 'futu') return { ...item, amount: 19000 }
    if (item.id === 'alipay') return { ...item, amount: 150000 }
    if (item.id === 'mortgage') return { ...item, amount: 1920000 }
    return item
  }),
}

export const sampleCurrent: Snapshot = {
  ...samplePrevious,
  id: 'sample-q4',
  date: '2026-11-02',
  period: 'year',
  usdCny: 6.6529,
  fxDate: '2026-10-30',
  items,
}
