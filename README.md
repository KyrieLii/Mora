# Family Finance Review

English | [简体中文](README.zh-CN.md)

A quick, private balance-sheet check-up for households. Every quarter or year, update what you own, what you owe and what comes in and goes out, then see your net worth, how it has changed, and how many months your savings would last if the main income stopped.

The interface is available in Chinese (家庭财务盘点) and English and is built for urban Chinese households, where property, mortgages, the housing provident fund and mixed RMB/USD holdings are the norm.

> Prototype. All data stays in your browser's local storage and no account is needed. If you use the screenshot import, the images or text you choose go straight from your browser to the AI provider you set up, never to a server of ours; your API key is stored only in your browser.

There are three ways to use it:

1. **Enter figures by hand** in the web app. No AI needed.
2. **Import from screenshots or text** in the web app, with your own API key (Anthropic, or any OpenAI-compatible endpoint). You review every line before it is added.
3. **Ask your AI agent**, through the bundled [Agent Skill](#use-it-from-an-agent). The agent reads your material and the results open as a local HTML page.

## What it does

- **Balance sheet**: cash, investments, property, restricted assets (such as the housing provident fund), other assets and liabilities. Add as many accounts as you like, or create custom items.
- **Cash flow**: income (salary, bonuses, one-off compensation) and expenses (rent, insurance, subscriptions), each with its own frequency. Everything is converted to a monthly figure.
- **Safety cushion (安全垫)**: a month-by-month simulation of how long the household can cover its spending after the main income stops, drawing on cash first and then on investments at a stressed market value.
- **Trend**: net worth across saved reviews, with change since the last review and since about a year ago.
- **Two currencies**: RMB and USD, converted at a daily rate. Each saved review keeps the rate it used.
- **Screenshot and text import**: recognises balances, income and spending from bank, brokerage and payroll screenshots or pasted text, proposes updating existing lines or adding new ones, and applies only the lines you tick. Card and account numbers are removed from names.
- **Chinese and English**, light and dark themes, and a mobile-first layout: on phones, editing and results are separate pages.

It is not a budgeting app and does not connect to banks. It is a snapshot you update a few times a year.

## Use it from an agent

`skills/family-finance-review/` is an [Agent Skill](https://agentskills.io) for people who already work with an AI agent such as Claude Code or Codex. The agent reads your screenshots and statements, writes the review as JSON, and runs the bundled CLI (`scripts/ffr.mjs`, Node 20+, no dependencies), which does every calculation with the same engine as the web app. You check an HTML preview, confirm in chat, and only then is the review saved.

- Each review is saved as one JSON file, `~/.family-finance-review/reviews/<date>.json`, so any review can be reopened and compared month on month or year on year.
- Result pages are single, self-contained HTML files that work offline. Nothing is uploaded.

To install, copy or link the folder into your agent's skills directory, for example `~/.claude/skills/family-finance-review`. See [SKILL.md](skills/family-finance-review/SKILL.md) for the workflow and [format.md](skills/family-finance-review/references/format.md) for the data format.

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
| `pnpm build:skill` | Rebuild the skill's CLI and its embedded report page |

## Project structure

```text
src/
  engine/      Pure, deterministic calculation: balance sheet, cash flow, safety-cushion simulation
  lib/         Formatting, local storage and migration, theme, icons
  components/  Ledger UI (sheets, verdict, report, trend chart) and the one shadcn primitive in use
  screens/     The review page (edit and result) and the read-only sample
  report/      The standalone result page the skill's CLI writes
  cli/         The skill's CLI (bundled into skills/family-finance-review/scripts/ffr.mjs)
  sample.ts    A fictional household used by the sample page
```

The engine has no UI or network dependencies, so it can be reused by other front ends later.

## Tech stack

React, Vite, TypeScript, Tailwind CSS v4, Radix (via shadcn/ui), lucide icons, Vitest.

## Disclaimer

This tool runs scenarios only. It is not investment, legal or real-estate advice. Default assumptions (market drop, cost of living after job loss, and so on) are product assumptions and have not been calibrated against real data.
