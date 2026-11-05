# Data format

## Input (what you write)

A JSON object. Only `items` is required; everything else has a default. Get the valid category ids from `mora categories`.

```json
{
  "date": "2026-11-03",
  "period": "quarter",
  "scope": "family",
  "baseCurrency": "CNY",
  "usdCny": 7.12,
  "fxDate": "2026-11-02",
  "items": [
    { "category": "checking", "name": "招行 活期", "amount": 52000, "currency": "CNY" },
    { "category": "mmf", "name": "余额宝", "amount": 18500 },
    { "category": "stock", "name": "富途 美股", "amount": 21000, "currency": "USD" },
    { "category": "home", "name": "自住房", "amount": 3000000 },
    { "category": "hpf", "name": "公积金", "amount": 160000 },
    { "category": "mortgage", "name": "房贷", "amount": 1180000, "monthlyPayment": 8800 }
  ],
  "flows": [
    { "category": "salary", "name": "月薪", "amount": 30000, "frequency": "monthly" },
    { "category": "familySalary", "name": "月薪-家人", "amount": 15000 },
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
| `usdCny` | previous review's rate, else the bundled rate | Dollars to yuan, e.g. `7.12`. Use the `usdCny` from `mora fx`. |
| `fxDate` | `date` when `usdCny` is set | The day the rate was published, `YYYY-MM-DD`: the `fxDate` from `mora fx`. Ignored without `usdCny`. |
| `items[]` | | Balances: assets and liabilities. |
| `flows[]` | `[]` | Income and spending lines. The safety cushion requires spending or loan payments. |
| `insurance[]` | `[]` | Yearly reviews only: any of `life`, `critical`, `medical`, or `none` / `unknown`. |

**Items:** `category` (required), `name` (defaults to the category name), `amount` (required, 0 or more; for a liability, the remaining principal or balance owed), `currency` (`CNY` or `USD`, defaults to `baseCurrency`), `monthlyPayment` (liabilities only), `monthlyRent` (`rental` only).

**Flows:** `category` (required), `name`, `amount` per payment, `currency`, `frequency` (`monthly`, `quarterly`, `annual`, or `once` for one-off income such as severance; defaults to the category's usual frequency).

Loan repayments belong on the liability as `monthlyPayment`, not as an expense line. Living costs that are not itemised go in `living`.

## Saved review files

`mora save` writes one file per review: `<dir>/reviews/<date>.json`. It is the input after validation, with ids, the exchange-rate date (when not given) and the derived monthly cash flow added:

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
  "fxDate": "2026-11-02",
  "items": [{ "id": "…", "category": "checking", "name": "招行 活期", "amount": 52000, "currency": "CNY" }],
  "flows": [{ "id": "…", "category": "salary", "name": "月薪", "amount": 30000, "currency": "CNY", "frequency": "monthly" }],
  "insurance": [],
  "cashflow": { "monthlyIncome": 50000, "incomeAfterLoss": 15000, "livingExpense": 13933.33, "severance": 0 }
}
```

Lines keep the same `id` from one review to the next when the category, currency and name match (a similar name counts), which is how the page shows what changed. Keep names stable between reviews.

To correct a saved review, write a new input for the same date and run `mora save <file> --replace` after the user confirms.

## Figures (what the CLI returns)

`check`, `preview`, `save`, `show` and `report` return `figures`:

- `netWorth`, `totalAssets`, `totalLiabilities`, `byGroup` (cash, investment, fixed, restricted, other, liability), all in `currency`.
- `liquidSharePercent`: cash and investments as a share of assets.
- `monthlyIncome`, `monthlyExpense`, `monthlyDebtPayment`, `monthlySurplus`, `savingsRatePercent`, `debtToIncomePercent`.
- `safetyCushion`: full months of recorded spending and loan payments covered by current cash and investment balances, with no future income. `months` is a number, `"60+"`, or `null` when spending and loan payments are zero. `rating` is `tight`, `moderate`, `ample`, or `null`. The legacy fields `range` and `sustainable` are fixed at `null` and `false`.
- `monthOnMonth` and `yearOnYear`: `netWorthChange`, the part of it caused by the exchange rate (`fromExchangeRate`), and `cushionMonthsChange`, or `null` when there is nothing to compare with.
