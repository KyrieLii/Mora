import { deriveCashflow, type Snapshot } from '@/engine'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export const REVIEW_FORMAT = 'family-finance-review/review@1'

/** One saved review per file, named by date, so any single review can be read, shown or compared on its own. */
export interface ReviewFile extends Snapshot {
  format: typeof REVIEW_FORMAT
  savedAt: string
}

export function dataDir(flag?: string) {
  const configured = flag ?? process.env.MORA_DIR ?? process.env.FFR_DIR
  if (configured !== undefined) return resolve(configured)

  const current = join(homedir(), '.mora')
  const legacy = join(homedir(), '.family-finance-review')
  return !existsSync(current) && existsSync(legacy) ? legacy : current
}

export const reviewsDir = (dir: string) => join(dir, 'reviews')
export const reviewPath = (dir: string, date: string) => join(reviewsDir(dir), `${date}.json`)

function readReview(path: string): Snapshot {
  const file = JSON.parse(readFileSync(path, 'utf8')) as Partial<ReviewFile>
  if (file.format !== REVIEW_FORMAT) throw new Error(`${path} is not a review file (expected "format": "${REVIEW_FORMAT}").`)
  const { format: _format, savedAt: _savedAt, ...snapshot } = file as ReviewFile
  // Cash flow is derived; recompute it so a hand-edited file stays consistent.
  return snapshot.flows ? { ...snapshot, cashflow: deriveCashflow(snapshot.flows, snapshot.baseCurrency, snapshot.usdCny) } : snapshot
}

/** All saved reviews, oldest first. */
export function loadReviews(dir: string): Snapshot[] {
  const folder = reviewsDir(dir)
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .map((name) => readReview(join(folder, name)))
}

export function writeReview(dir: string, snapshot: Snapshot) {
  mkdirSync(reviewsDir(dir), { recursive: true })
  const file: ReviewFile = { format: REVIEW_FORMAT, savedAt: new Date().toISOString(), ...snapshot }
  const path = reviewPath(dir, snapshot.date)
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`)
  return path
}

export function writeText(path: string, text: string) {
  mkdirSync(resolve(path, '..'), { recursive: true })
  writeFileSync(path, text)
  return path
}
