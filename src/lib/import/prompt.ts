import { CATEGORIES, FLOW_CATEGORIES } from '@/engine'

const assetIds = CATEGORIES.filter((entry) => entry.group !== 'liability').map((entry) => entry.id)
const liabilityIds = CATEGORIES.filter((entry) => entry.group === 'liability').map((entry) => entry.id)
const incomeIds = FLOW_CATEGORIES.filter((entry) => entry.kind === 'income').map((entry) => entry.id)
const expenseIds = FLOW_CATEGORIES.filter((entry) => entry.kind === 'expense').map((entry) => entry.id)

export const ALL_CATEGORY_IDS = [...assetIds, ...liabilityIds, ...incomeIds, ...expenseIds]

const describe = (ids: string[], source: { id: string; label: string }[]) =>
  ids.map((id) => `${id} (${source.find((entry) => entry.id === id)!.label})`).join(', ')

/** JSON Schema the model's answer must follow. Kept flat so every provider can honour it. */
export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lines', 'warnings'],
  properties: {
    lines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'amount', 'currency', 'kind', 'category', 'frequency', 'monthlyPayment'],
        properties: {
          name: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string', enum: ['CNY', 'USD', 'OTHER'] },
          kind: { type: 'string', enum: ['asset', 'liability', 'income', 'expense'] },
          category: { type: 'string', enum: ALL_CATEGORY_IDS },
          frequency: { type: 'string', enum: ['monthly', 'quarterly', 'annual', 'once'] },
          monthlyPayment: { type: ['number', 'null'] },
        },
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
} as const

/** The fixed instructions; volatile input goes in the user turn so this prefix stays cacheable. */
export const SYSTEM_PROMPT = `You read screenshots and pasted text from Chinese banking, brokerage, payment and payroll apps, and extract the household's balances and money flows for a private balance-sheet tool.

Return JSON that matches the schema. One entry in "lines" per distinct balance or flow.

What to extract
- Balances people own: deposits, wallet balances, money-market funds such as 余额宝/零钱通, time deposits, funds, stocks, bonds and wealth products, crypto, housing provident fund, pensions. Use kind "asset".
- Debts: mortgages, car loans, consumer loans, credit card balances. Use kind "liability"; "amount" is the remaining principal or statement balance, and "monthlyPayment" is the monthly repayment when shown, otherwise null.
- Income (salary slips, bonus notices) as kind "income" and spending (rent, insurance, subscriptions, bills) as kind "expense", with the frequency it is paid. Balances use frequency "monthly" and monthlyPayment null.

Avoid double counting
- When a screen shows a total and the parts that make it up, return the parts, not the total.
- When a brokerage screen shows one account's total or net asset value together with sub-figures such as market value, cash, buying power or withdrawable amount, return a single line for the account's net asset value in category "stock" (or "fund" for a fund platform), not its sub-figures.
- Skip anything that is not a balance or a flow: daily or yesterday's returns, profit and loss, percentages, buying power, withdrawable amounts, credit limits, risk status, promotional text, and zero balances.

Categories (use the id): assets ${describe(assetIds, CATEGORIES)}; liabilities ${describe(liabilityIds, CATEGORIES)}; income ${describe(incomeIds, FLOW_CATEGORIES)}; expenses ${describe(expenseIds, FLOW_CATEGORIES)}. When nothing fits, use cashOther, investOther, otherAsset, otherDebt, incomeOther or expenseOther.

Currency: CNY for ¥/元/人民币, USD for $/美元/USD. Any other currency (HKD, EUR and so on): set "OTHER", keep the number as shown, and add a warning naming the currency.

Names: a short label the user will recognise, made of the app or institution and the product, such as "富途证券" or "支付宝 余额宝". Write it in the language of the source.

Privacy, which overrides everything above
- Never include card numbers, account numbers or their last digits, phone numbers, ID numbers, or any person's name or nickname, including names that appear in watermarks. Leave them out of "name" entirely.

Amounts are plain numbers without separators or currency symbols. If the image is unreadable or contains no balances, return an empty "lines" array and explain in "warnings".`
