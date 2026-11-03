# Data format

## Input (what you write)

A JSON object. Only `items` is required; everything else has a default. Get the valid category ids from `ffr categories`.

```json
{
  "date": "2026-11-03",
  "period": "quarter",
  "scope": "family",
  "baseCurrency": "CNY",
  "usdCny": 7.12,
  "items": [
    { "category": "checking", "name": "招行 活期", "amount": 52000, "currency": "CNY" },
    { "category": "mmf", "name": "余额宝", "amount": 18500 },
    { "category": "stock", "name": "富途 美股", "amount": 21000, "currency": "USD" },
    { "category": "home", "name": "自住房", "amount": 3000000, "isEstimate": true },
    { "category": "hpf", "name": "公积金", "amount": 160000 },
    { "category": "mortgage", "name": "房贷", "amount": 1180000, "monthlyPayment": 8800 }
  ],
  "flows": [
    { "category": "salary", "name": "我的工资", "amount": 30000, "frequency": "monthly" },
    { "category": "familyIncome", "name": "配偶工资", "amount": 15000, "continues": true },
    { "category": "yearBonus", "amount": 60000, "frequency": "annual" },
    { "category": "living", "amount": 13500 },
    { "category": "carInsurance", "amount": 5200, "frequency": "annual" }
  ],
  "insurance": ["medical", "critical"]
}
```

| Field | Default | Notes |
|---|---|---|
| `date` | today | `YYYY-MM-DD`. One saved review per date. |
| `period` | `quarter` | `quarter` or `year`. |
| `scope` | `family` | `family` or `personal`. |
| `baseCurrency` | `CNY` | Currency the results are shown in: `CNY` or `USD`. |
| `usdCny` | previous review's rate, else the bundled rate | Dollars to yuan, e.g. `7.12`. Set it when you know the current rate. |
| `items[]` | | Balances: assets and liabilities. |
| `flows[]` | `[]` | Income and spending lines. Without spending lines the safety cushion cannot be worked out. |
| `insurance[]` | `[]` | Yearly reviews only: any of `life`, `critical`, `medical`, or `none` / `unknown`. |

**Items:** `category` (required), `name` (defaults to the category name), `amount` (required, 0 or more; for a liability, the remaining principal or balance owed), `currency` (`CNY` or `USD`, defaults to `baseCurrency`), `isEstimate` (true when the figure is a guess), `monthlyPayment` (liabilities only), `monthlyRent` (`rental` only).

**Flows:** `category` (required), `name`, `amount` per payment, `currency`, `frequency` (`monthly`, `quarterly`, `annual`, or `once` for one-off income such as severance; defaults to the category's usual frequency), `continues` (income that carries on if the main earner's pay stops, such as a partner's salary or rent).

Loan repayments belong on the liability as `monthlyPayment`, not as an expense line. Living costs that are not itemised go in `living`.

## Saved review files

`ffr save` writes one file per review: `<dir>/reviews/<date>.json`. It is the input after validation, with ids, the exchange-rate date and the derived monthly cash flow added:

```json
{
  "format": "family-finance-review/review@1",
  "savedAt": "2026-11-03T08:12:00.000Z",
  "id": "…",
  "date": "2026-11-03",
  "period": "quarter",
  "scope": "family",
  "baseCurrency": "CNY",
  "usdCny": 7.12,
  "fxDate": "2026-11-03",
  "items": [{ "id": "…", "category": "checking", "name": "招行 活期", "amount": 52000, "currency": "CNY" }],
  "flows": [{ "id": "…", "category": "salary", "name": "我的工资", "amount": 30000, "currency": "CNY", "frequency": "monthly" }],
  "insurance": [],
  "cashflow": { "monthlyIncome": 50000, "incomeAfterLoss": 15000, "livingExpense": 13933.33, "severance": 0 }
}
```

Lines keep the same `id` from one review to the next when the category, currency and name match (a similar name counts), which is how the page shows what changed. Keep names stable between reviews.

To correct a saved review, write a new input for the same date and run `ffr save <file> --replace` after the user confirms.

## Figures (what the CLI returns)

`check`, `preview`, `save`, `show` and `report` return `figures`:

- `netWorth`, `totalAssets`, `totalLiabilities`, `byGroup` (cash, investment, fixed, restricted, other, liability), all in `currency`.
- `liquidSharePercent`: cash and investments as a share of assets.
- `monthlyIncome`, `monthlyExpense`, `monthlyDebtPayment`, `monthlySurplus`, `savingsRatePercent`, `debtToIncomePercent`.
- `safetyCushion`: `months` (a number, or `"60+"`), `range` (low and high months when some figures are estimates), `sustainable` (other income covers spending), `rating` (`tight`, `moderate`, `ample`).
- `monthOnMonth` and `yearOnYear`: `netWorthChange`, the part of it caused by the exchange rate (`fromExchangeRate`), and `cushionMonthsChange`, or `null` when there is nothing to compare with.
