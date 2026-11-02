# AGENTS.md

Guidance for coding agents working in this repository.

## Project

Family Finance Review (家庭财务盘点) is a mobile-first web app for a quarterly or yearly household balance-sheet review. The UI is bilingual (Simplified Chinese and English); code, comments and commit messages are English. All user data lives in `localStorage`; there is no backend.

## Commands

Use pnpm (pinned in `package.json`; run through `corepack pnpm` if `pnpm` is not on PATH).

```bash
pnpm install
pnpm dev          # dev server
pnpm test         # Vitest, engine tests
pnpm typecheck    # tsc --noEmit
pnpm build        # production build
```

Before finishing a change, run `pnpm typecheck`, `pnpm test` and `pnpm build`.

## Layout

- `src/engine/index.ts`: all calculation. Pure, deterministic, no React, no network. Every behaviour change here needs a test in `src/engine/index.test.ts`.
- `src/lib/store.ts`: storage key, default sheet, `newItem` / `newFlow`, migration of older saved data, and `withDerivedCashflow`.
- `src/lib/format.ts`: money formatting (`money`, `shortMoney` with 万/亿) and `parseAmount`, which accepts input like `1.5万`.
- `src/components/ledger/`: the sheets (`GroupSheet`, `FlowSheet`, `InsuranceSheet`), `Verdict`, `ReportPanel`, `TrendChart`, `Header`, `InfoTip`, `AmountInput`.
- `src/screens/Ledger.tsx`: desktop two-column page; on mobile, an edit view and a read-only result view. `src/screens/Example.tsx` is the read-only sample.
- `src/sample.ts`: a fictional household. Keep it fictional.

## Data model rules

- `Snapshot.flows` (income and expense lines) is the source of truth for cash flow. `Snapshot.cashflow` is derived from it by `deriveCashflow` on every edit; never edit `cashflow` directly when `flows` exists.
- One-off income (`frequency: 'once'`) is excluded from monthly totals and counts only as cash available when income stops.
- Loan repayments belong to liability items (`monthlyPayment`), not to expense lines.
- Saved data must keep loading. If you change the shape of stored data, add a migration in `loadStored` and a test.

## UI and copy rules

- All user-facing text lives in `src/i18n/zh.ts` (source) and `src/i18n/en.ts`, which must match its shape; read it with `useI18n()`. Never hard-code UI strings in components. Category names are looked up by id; `displayName` shows a stored default name in the current language.
- `shortMoney` uses 万/亿 in Chinese and K/M/B in English; `parseAmount` accepts both.
- Read `PRODUCT.md` and `DESIGN.md` at the repo root before UI work if they exist. They are local and gitignored, so they may be absent in a fresh clone.
- Visual language: mint `#61ffca` liquid glass. Use the existing `.glass`, `.glass-asset`, `.glass-liability`, `.glass-flow`, `.glass-capsule` and `.liquid-action` classes and the tokens in `src/styles.css`; do not add raw colours.
- Colour carries meaning: assets green, liabilities coral, cash flow blue. Report figures stay in the ink colour. The mint fill is reserved for the single primary action on a screen.
- Keep pages quiet: explanations go into `InfoTip`, not into always-visible paragraphs.
- Terminology: say 安全垫 (safety cushion), with ratings 安全垫偏薄 / 安全垫适中 / 安全垫充足. Do not use 跑道, 缓冲期 or 撑得住.
- Tone is calm and neutral. The app runs scenarios only: never give buy, sell or property-sale advice, and never invent users, testimonials or performance claims.
- Icon-only controls need a hit area of at least 44px.
- Check changes at a 390px phone width and a 1440px desktop width, in both light and dark themes.

## Git

- Do not commit `PRODUCT.md`, `DESIGN.md` or `.impeccable/`. They are listed in `.gitignore`.
- Do not commit `.env` files or any credentials.
