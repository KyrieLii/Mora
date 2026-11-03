---
name: family-finance-review
description: Run a quarterly or yearly household balance-sheet review (家庭财务盘点) from the user's screenshots, pasted text or statements. Use when the user wants to take stock of family or personal assets, debts, income and spending, see net worth and how many months of spending their savings would cover (安全垫), compare with earlier reviews (环比 / 同比), or open a saved review. Produces local JSON files and a self-contained HTML result page.
license: AGPL-3.0-only (https://github.com/KyrieLii/family-finance-review/blob/main/LICENSE). A commercial license is available from the author.
---

# Family finance review

You do the reading and organising; the bundled CLI does every calculation and writes the files; a local HTML page shows the result. Figures you quote must come from the CLI, never from your own arithmetic.

## Setup

- The CLI is `scripts/ffr.mjs` in this skill's folder. Run it with Node 20 or newer: `node <skill-dir>/scripts/ffr.mjs <command>`. It has no dependencies. Only `ffr fx` uses the network; every other command works offline.
- Every command prints JSON. A failed command prints `"ok": false` with `errors` and exits with status 1.
- Data lives in `~/.family-finance-review` unless the user wants another folder; pass `--dir <path>` on every call (or set `FFR_DIR`). On first use, tell the user where their data will be kept.

## Workflow

1. **Look at what exists.** Run `ffr list`. If there are saved reviews, run `ffr show latest` and start from that review's lines: ask what changed rather than collecting everything again.
2. **Collect.** Ask for screenshots of bank, brokerage, wallet and loan apps, pasted text, or statements, and the period (quarter or year). Read them using [references/reading-sources.md](references/reading-sources.md). Remind the user to cover card numbers and names before sharing.
3. **Write the input.** Put the review in a JSON file, for example `<dir>/drafts/<date>.json`, following [references/format.md](references/format.md). Run `ffr categories` for the valid category ids. Ask about anything you are unsure of instead of guessing; mark rough figures with `"isEstimate": true`.
   If any line is in the other currency, get today's rate: tell the user you will fetch the ECB reference rate from api.frankfurter.dev (it sees their IP address, nothing about their finances), then run `ffr fx` and copy its `usdCny` and `fxDate` into the input. If it fails, say so; the review then uses the `fallback` rate the command prints. Do not look rates up elsewhere unless the user asks.
4. **Check.** Run `ffr check <file>`. Fix every error. Raise each warning with the user if it needs their input.
5. **Preview and confirm.** Run `ffr preview <file> --open` (add `--lang en` for English). This writes `<dir>/preview.html`, a page marked "not saved", and opens it. In chat, give the headline figures from the command's `figures` (net worth, safety cushion and its rating, change since the last review) and list the lines briefly. Ask the user to confirm or correct. Repeat steps 3 to 5 until they confirm.
6. **Save only after the user clearly confirms.** Run `ffr save <file>`. If a review for that date exists, the command refuses; ask before re-running with `--replace`.
7. **Show the result.** Run `ffr report --open` to write `<dir>/reports/<date>.html` with trends across every saved review.

On the preview and report pages the user can refresh or edit the rate to see the figures at another rate. That changes only the page, never the saved file; if they want the new rate kept, update the input and save again with `--replace` after they confirm.

To open an earlier review, run `ffr list`, then `ffr report <date> --open` or `ffr show <date>`. `show` returns `monthOnMonth` (against the previous review) and `yearOnYear` (against the review closest to a year earlier) when those exist.

## Rules

- Never save without the user's explicit confirmation of the preview.
- Never write or edit files under `<dir>/reviews/` yourself; they change only through `ffr save`.
- Never record card numbers, account numbers or their last digits, ID numbers, phone numbers or people's names. Use short labels like "招行 活期" or "富途 美股".
- Only CNY and USD are supported. Convert other currencies yourself, say which rate you used, and record the converted amount.
- The safety cushion (安全垫) is the number of months the household could keep paying for living costs and loan repayments if the main income stopped, using cash first, then investments sold after a 30% fall. Its ratings are 安全垫偏薄 / 安全垫适中 / 安全垫充足 (tight / moderate / ample). Do not call it 跑道, 缓冲期 or 撑得住.
- Describe, do not advise. Never recommend buying, selling, rebalancing or selling a home, and never predict returns.
- The HTML pages hold the user's full figures. They are self-contained and work offline. Publish or upload one only if the user asks you to, and say that anyone with the link could see it.
