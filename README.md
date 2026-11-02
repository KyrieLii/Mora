# Family Finance Review

English | [简体中文](README.zh-CN.md)

A quick, private balance-sheet check-up for households. Every quarter or year, update what you own, what you owe and what comes in and goes out, then see your net worth, how it has changed, and how many months your savings would last if the main income stopped.

The interface is in Chinese (家庭财务盘点) and is built for urban Chinese households, where property, mortgages, the housing provident fund and mixed RMB/USD holdings are the norm.

> Prototype. All data stays in your browser's local storage. Nothing is uploaded and no account is needed.

## What it does

- **Balance sheet**: cash, investments, property, restricted assets (such as the housing provident fund), other assets and liabilities. Add as many accounts as you like, or create custom items.
- **Cash flow**: income (salary, bonuses, one-off compensation) and expenses (rent, insurance, subscriptions), each with its own frequency. Everything is converted to a monthly figure.
- **Safety cushion (安全垫)**: a month-by-month simulation of how long the household can cover its spending after the main income stops, drawing on cash first and then on investments at a stressed market value.
- **Trend**: net worth across saved reviews, with change since the last review and since about a year ago.
- **Two currencies**: RMB and USD, converted at a daily rate. Each saved review keeps the rate it used.
- **Light and dark themes**, with a mobile-first layout: on phones, editing and results are separate pages.

It is not a budgeting app and does not connect to banks. It is a snapshot you update a few times a year.

## Getting started

Requires Node 20+ and pnpm (available through Corepack).

```bash
corepack enable
pnpm install
pnpm dev
```

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run the engine tests (Vitest) |
| `pnpm typecheck` | Type-check the project |
| `pnpm fx:update` | Refresh the USD/CNY rate in `public/fx.json` |

## Project structure

```text
src/
  engine/      Pure, deterministic calculation: balance sheet, cash flow, safety-cushion simulation
  lib/         Formatting, local storage and migration, theme, icons
  components/  Ledger UI (sheets, verdict, report, trend chart) and the one shadcn primitive in use
  screens/     The review page (edit and result) and the read-only sample
  sample.ts    A fictional household used by the sample page
```

The engine has no UI or network dependencies, so it can be reused by other front ends later.

## Tech stack

React, Vite, TypeScript, Tailwind CSS v4, Radix (via shadcn/ui), lucide icons, Vitest.

## Disclaimer

This tool runs scenarios only. It is not investment, legal or real-estate advice. Default assumptions (market drop, cost of living after job loss, and so on) are product assumptions and have not been calibrated against real data.
