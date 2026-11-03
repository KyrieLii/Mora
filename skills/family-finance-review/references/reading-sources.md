# Reading screenshots, text and statements

Most sources are screenshots of Chinese bank, brokerage, payment and payroll apps. Extract one line per distinct balance or flow.

## What to take

- Balances the household owns: deposits, wallet balances (微信零钱, 支付宝余额), money-market funds (余额宝, 零钱通), time deposits, funds, stocks, bonds and wealth products, crypto, housing provident fund (公积金), pensions.
- Debts: mortgages, car loans, consumer loans, credit-card balances. The amount is the remaining principal or the statement balance; note the monthly repayment when shown.
- Income (salary slips, bonus notices) and spending (rent, insurance, subscriptions, bills) with how often they are paid.

## Avoid double counting

- When a screen shows a total and the parts that make it up, record the parts, not the total.
- A brokerage screen usually shows the account's total or net asset value with sub-figures (market value, cash, buying power, withdrawable). Record one line for the account's net asset value, in `stock` (or `fund` for a fund platform). Split securities and cash only when the screen clearly shows them as separate balances that add up.
- An app's "total assets" page that lists 余额宝, funds and other products: record each product, not the total.

## What to skip

Daily or yesterday's returns, profit and loss, percentages, buying power, withdrawable amounts, credit limits, points, risk ratings, promotions, and zero balances.

## Category hints

| Source | Category |
|---|---|
| 银行活期, 储蓄卡 | `checking` |
| 微信零钱, 支付宝余额 | `wallet` |
| 余额宝, 零钱通, other money-market funds | `mmf` |
| 定期, 大额存单 | `deposit` |
| Brokerage account (A-shares, HK, US) | `stock` |
| Fund holdings (基金) | `fund` |
| 银行理财, bonds | `bond` |
| 公积金 | `hpf` |
| 个人养老金 | `pension` |
| 信用卡待还 | `creditCard` |
| 房贷 / 车贷 / 消费贷 | `mortgage` / `carLoan` / `consumerLoan` |

When nothing fits, use the catch-all for that kind (`cashOther`, `investOther`, `fixedOther`, `restrictedOther`, `otherAsset`, `otherDebt`, `incomeOther`, `expenseOther`).

## Currency

`¥`, 元 and 人民币 are CNY; `$`, 美元 and USD are USD. For any other currency (HKD, EUR and so on), convert to CNY or USD, tell the user the rate you used, and keep the original figure in your message so they can check it.

## Privacy

Never write card or account numbers or their last digits, phone or ID numbers, or anyone's name or nickname (including names in watermarks) into names or anywhere in the files. Use the institution and product only, such as "招行 活期" or "富途 美股".

## When unsure

If a figure is unreadable, cut off, or could be either a total or a part, ask the user. If they give a rough figure, record it with `"isEstimate": true`.
