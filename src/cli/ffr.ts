import { CATEGORIES, FLOW_CATEGORIES, GROUPS, type Snapshot } from '@/engine'
import { en } from '@/i18n/en'
import { zh } from '@/i18n/zh'
import { FX_SOURCE_HOST, fetchLatestRate } from '@/lib/fx'
import { digest } from '@/lib/snapshot/digest'
import { normalizeSnapshot } from '@/lib/snapshot/normalize'
import { DATA_PLACEHOLDER, embedPayload, type ReportPayload } from '@/report/payload'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
// Used only when there is no earlier review; kept apart from public/fx.json so a new site rate does not change the bundle.
import fx from './fallback-fx.json'
import template from '../../dist-report/report.html?raw'
import { dataDir, loadReviews, reviewPath, writeReview, writeText } from './store'

const HELP = `ffr: family finance review for agents

Usage: ffr <command> [options]

Commands
  categories                 List category ids with Chinese and English names.
  check <input.json|->       Validate a review and print its figures. Nothing is written.
  preview <input.json|->     Validate, then write an HTML preview (not saved) next to the data.
  save <input.json|->        Save the review as reviews/<date>.json. Use --replace to overwrite that date.
  list                       List saved reviews.
  show [date|latest]         Print the figures of a saved review, with month-on-month and year-on-year change.
  report [date|latest]       Write the HTML result page of a saved review, with every earlier review for trends.
  fx                         Get the latest USD/CNY reference rate from ${FX_SOURCE_HOST}. The only command that uses the network.

Options
  --dir <path>      Data folder (default $FFR_DIR or ~/.family-finance-review).
  --lang zh|en      Language of the HTML page (default zh).
  --out <path>      Where to write the HTML page.
  --open            Open the HTML page after writing it.
  --replace         Allow save to overwrite an existing review for the same date.

All output is JSON on stdout; errors exit with status 1.`

const today = () => new Date().toISOString().slice(0, 10)

function print(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

function fail(message: string, extra: Record<string, unknown> = {}): never {
  print({ ok: false, error: message, ...extra })
  process.exit(1)
}

function readInput(path: string | undefined): unknown {
  if (!path) fail('Missing input file. Pass a JSON file path, or - to read from stdin.')
  const text = path === '-' ? readFileSync(0, 'utf8') : existsSync(path) ? readFileSync(path, 'utf8') : fail(`Input file not found: ${path}`)
  try {
    return JSON.parse(text)
  } catch (error) {
    fail(`Input is not valid JSON: ${(error as Error).message}`)
  }
}

/** Reviews saved strictly before a date, oldest first. */
const before = (reviews: Snapshot[], date: string) => reviews.filter((review) => review.date < date)

/** The most recent review at least about ten months older, used for year-on-year. */
function yearAgo(reviews: Snapshot[], date: string) {
  const limit = new Date(date)
  limit.setDate(limit.getDate() - 300)
  return reviews.filter((review) => new Date(review.date) <= limit).at(-1)
}

function figures(snapshot: Snapshot, history: Snapshot[]) {
  const previous = history.at(-1)
  const lastYear = yearAgo(history, snapshot.date)
  const result = digest(snapshot, previous)
  const yoy = lastYear ? digest(snapshot, lastYear).sincePrevious : null
  return { ...result, monthOnMonth: result.sincePrevious, yearOnYear: yoy, sincePrevious: undefined }
}

function normalize(input: unknown, reviews: Snapshot[]) {
  const date = (input as { date?: string })?.date ?? today()
  const history = before(reviews, date)
  const result = normalizeSnapshot(input, { previous: history.at(-1), fallbackRate: { usdCny: fx.usdCny, date: fx.date }, today: today() })
  if (!result.snapshot) fail('The review has errors; fix them and run again.', { errors: result.errors, warnings: result.warnings })
  return { snapshot: result.snapshot, history, warnings: result.warnings }
}

function pick(reviews: Snapshot[], which: string | undefined) {
  if (reviews.length === 0) fail('No saved reviews yet. Save one first with: ffr save <input.json>')
  if (!which || which === 'latest') return reviews.at(-1)!
  return reviews.find((review) => review.date === which) ?? fail(`No saved review for ${which}.`, { saved: reviews.map((review) => review.date) })
}

function writeHtml(payload: ReportPayload, out: string, open: boolean) {
  // Match the whole data tag: the inlined script also contains the placeholder string.
  const tag = `<script id="ffr-data" type="application/json">${DATA_PLACEHOLDER}</script>`
  // A single reference keeps the bundler from inlining the large template string twice.
  const parts = template.split(tag)
  if (parts.length !== 2) fail('The bundled report template is missing its data tag; rebuild with pnpm build:skill.')
  const html = parts.join(`<script id="ffr-data" type="application/json">${embedPayload(payload)}</script>`)
  const path = writeText(resolve(out), html)
  if (open) {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
    const args = process.platform === 'win32' ? ['/c', 'start', '', path] : [path]
    spawn(command, args, { stdio: 'ignore', detached: true }).unref()
  }
  return path
}

/** Fetches the reference rate; on failure, says which rate a review would fall back to. */
async function latestRate(dir: string) {
  try {
    const rate = await fetchLatestRate()
    print({ ok: true, usdCny: rate.usdCny, fxDate: rate.date, source: `European Central Bank reference rate, via ${FX_SOURCE_HOST}` })
  } catch (error) {
    const last = loadReviews(dir).at(-1)
    const fallback = last ? { usdCny: last.usdCny, fxDate: last.fxDate, from: 'previous review' } : { usdCny: fx.usdCny, fxDate: fx.date, from: 'bundled rate' }
    fail(`Could not get the rate from ${FX_SOURCE_HOST}: ${(error as Error).message}`, { fallback })
  }
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: 'string' },
      lang: { type: 'string', default: 'zh' },
      out: { type: 'string' },
      open: { type: 'boolean', default: false },
      replace: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  })
  const [command, argument] = positionals
  if (!command || values.help) {
    process.stdout.write(`${HELP}\n`)
    return
  }
  const dir = dataDir(values.dir)
  const locale = values.lang === 'en' ? 'en' : 'zh'

  switch (command) {
    case 'categories':
      return print({
        balances: GROUPS.map((group) => ({
          group: group.id,
          kind: group.id === 'liability' ? 'liability' : 'asset',
          name: { zh: zh.groups[group.id], en: en.groups[group.id] },
          categories: CATEGORIES.filter((entry) => entry.group === group.id).map((entry) => ({ id: entry.id, zh: zh.categories[entry.id], en: en.categories[entry.id], catchAll: !!entry.generic })),
        })),
        flows: (['income', 'expense'] as const).map((kind) => ({
          kind,
          categories: FLOW_CATEGORIES.filter((entry) => entry.kind === kind).map((entry) => ({
            id: entry.id,
            zh: zh.flowCategories[entry.id],
            en: en.flowCategories[entry.id],
            defaultFrequency: entry.frequency,
            ...(entry.continues ? { continuesByDefault: true } : {}),
            catchAll: !!entry.generic,
          })),
        })),
      })

    case 'check': {
      const { snapshot, history, warnings } = normalize(readInput(argument), loadReviews(dir))
      return print({ ok: true, warnings, figures: figures(snapshot, history) })
    }

    case 'preview': {
      const { snapshot, history, warnings } = normalize(readInput(argument), loadReviews(dir))
      const path = writeHtml({ format: 'family-finance-review/report@1', mode: 'preview', locale, snapshots: [...history, snapshot] }, values.out ?? join(dir, 'preview.html'), values.open)
      return print({ ok: true, preview: path, saved: false, warnings, figures: figures(snapshot, history) })
    }

    case 'save': {
      const reviews = loadReviews(dir)
      const { snapshot, history, warnings } = normalize(readInput(argument), reviews)
      const existing = reviews.find((review) => review.date === snapshot.date)
      if (existing && !values.replace) fail(`A review for ${snapshot.date} is already saved at ${reviewPath(dir, snapshot.date)}. Pass --replace to overwrite it.`)
      const path = writeReview(dir, existing ? { ...snapshot, id: existing.id } : snapshot)
      return print({ ok: true, saved: path, replaced: !!existing, warnings, figures: figures(snapshot, history) })
    }

    case 'list':
      return print({
        ok: true,
        dir,
        reviews: loadReviews(dir).map((review) => {
          const result = digest(review)
          return { date: review.date, period: review.period, file: reviewPath(dir, review.date), netWorth: result.netWorth, currency: result.currency, safetyCushion: result.safetyCushion.months }
        }),
      })

    case 'show': {
      const reviews = loadReviews(dir)
      const review = pick(reviews, argument)
      return print({ ok: true, file: reviewPath(dir, review.date), figures: figures(review, before(reviews, review.date)) })
    }

    case 'report': {
      const reviews = loadReviews(dir)
      const review = pick(reviews, argument)
      const snapshots = [...before(reviews, review.date), review]
      const path = writeHtml({ format: 'family-finance-review/report@1', mode: 'saved', locale, snapshots }, values.out ?? join(dir, 'reports', `${review.date}.html`), values.open)
      return print({ ok: true, report: path, figures: figures(review, before(reviews, review.date)) })
    }

    case 'fx':
      return latestRate(dir)

    default:
      fail(`Unknown command "${command}". Run ffr --help.`)
  }
}

await main()
