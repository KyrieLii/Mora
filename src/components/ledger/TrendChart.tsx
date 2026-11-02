import { summarize, type Currency, type Snapshot } from '@/engine'
import { useI18n } from '@/i18n'
import { percent, shortMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp } from 'lucide-react'

const DAY = 86_400_000
const W = 320
const H = 150
const PAD = { top: 14, right: 12, bottom: 26, left: 12 }

/** The saved snapshot closest to one year before this one, within roughly ten to fourteen months. */
function yearAgo(history: Snapshot[], date: string) {
  const now = Date.parse(date)
  let best: Snapshot | undefined
  let bestGap = Infinity
  for (const entry of history) {
    const days = (now - Date.parse(entry.date)) / DAY
    if (days < 300 || days > 430) continue
    if (Math.abs(days - 365) < bestGap) {
      best = entry
      bestGap = Math.abs(days - 365)
    }
  }
  return best
}

function Change({ title, now, then, date, currency }: { title: string; now: number; then?: number; date?: string; currency: Currency }) {
  const { t } = useI18n()
  if (then === undefined) {
    return (
      <div className="grid gap-0.5 rounded-2xl border border-border px-3 py-2.5">
        <span className="text-xs text-muted-foreground">{title}</span>
        <span className="text-[15px] font-semibold text-muted-foreground">{t.trend.noComparison}</span>
      </div>
    )
  }
  const delta = now - then
  const Arrow = delta >= 0 ? ArrowUp : ArrowDown
  return (
    <div className="grid gap-0.5 rounded-2xl border border-border px-3 py-2.5">
      <span className="text-xs text-muted-foreground">
        {title} · {date}
      </span>
      <span className={cn('flex items-center gap-1 text-[17px] font-bold tabular-nums', delta < 0 && 'text-caution')}>
        <Arrow className="size-4" aria-label={delta >= 0 ? t.trend.up : t.trend.down} />
        {shortMoney(Math.abs(delta), currency)}
        {then !== 0 && <span className="text-[13px] font-semibold text-muted-foreground">{percent(Math.abs(delta) / Math.abs(then))}</span>}
      </span>
    </div>
  )
}

/** Net worth across every saved review, with the 环比 and 同比 change underneath. */
export function TrendChart({ draft, previous, history }: { draft: Snapshot; previous?: Snapshot; history: Snapshot[] }) {
  const { t } = useI18n()
  const currency = draft.baseCurrency
  const points = [...history.filter((entry) => entry.id !== draft.id), draft]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((snapshot) => ({ snapshot, summary: summarize({ ...snapshot, baseCurrency: currency }) }))
  const now = summarize(draft).netWorth
  const lastYear = yearAgo(history, draft.date)
  const net = (snapshot?: Snapshot) => (snapshot ? summarize({ ...snapshot, baseCurrency: currency }).netWorth : undefined)

  const values = points.map((point) => point.summary.netWorth)
  const low = Math.min(...values)
  const high = Math.max(...values)
  // Scale to the data's own range so quarter-to-quarter movement is visible, not flattened against zero.
  const span = Math.max(high - low, Math.abs(high) * 0.05, 1)
  const min = low - span * 0.35
  const max = high + span * 0.35
  // Spaced by date, so a ten-month gap reads wider than a two-month one; reviews saved on the same
  // day, or only days apart, still get a minimum gap so their points never stack.
  const first = Date.parse(points[0]!.snapshot.date)
  const range = Date.parse(points.at(-1)!.snapshot.date) - first
  const minGap = points.length > 1 ? Math.min(0.12, 1 / (points.length - 1)) : 0
  const spread = points.reduce<number[]>((acc, point, index) => {
    const raw = range < DAY ? index / Math.max(points.length - 1, 1) : (Date.parse(point.snapshot.date) - first) / range
    acc.push(index === 0 ? 0 : Math.max(raw, acc[index - 1]! + minGap))
    return acc
  }, [])
  const scale = spread.at(-1) || 1
  const x = (index: number) =>
    PAD.left + (points.length === 1 ? (W - PAD.left - PAD.right) / 2 : (spread[index]! / scale) * (W - PAD.left - PAD.right))
  const y = (value: number) => PAD.top + (1 - (value - min) / (max - min)) * (H - PAD.top - PAD.bottom)
  const label = (snapshot: Snapshot) => snapshot.date.slice(2, 7).replace('-', '.')
  // Ends are always labelled; a middle point only when it has room on both sides.
  const labelled = (index: number) =>
    index === 0 || index === points.length - 1 || (x(index) - x(index - 1) >= 44 && x(index + 1) - x(index) >= 44)
  // Two reviews in the same month share a date label; print it once, under the later point.
  const dated = (index: number) => labelled(index) && !(index < points.length - 1 && label(points[index]!.snapshot) === label(points.at(-1)!.snapshot))
  const line = points.map((point, index) => `${x(index)},${y(point.summary.netWorth)}`).join(' ')
  const base = H - PAD.bottom

  return (
    <div className="grid gap-3">
      {points.length > 1 ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={t.trend.aria(shortMoney(values[0]!, currency), shortMoney(now, currency))}>
          <defs>
            <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" className="[stop-color:var(--asset)]" stopOpacity="0.28" />
              <stop offset="100%" className="[stop-color:var(--asset)]" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={PAD.left} x2={W - PAD.right} y1={base} y2={base} className="stroke-border" />
          <polygon points={`${x(0)},${base} ${line} ${x(points.length - 1)},${base}`} fill="url(#trend-fill)" />
          <polyline points={line} fill="none" className="stroke-asset" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {points.map((point, index) => {
            const last = index === points.length - 1
            const anchor = index === 0 ? 'start' : last ? 'end' : 'middle'
            return (
              <g key={point.snapshot.id}>
                <circle cx={x(index)} cy={y(point.summary.netWorth)} r={last ? 4.5 : 3} className={last ? 'fill-asset stroke-card' : 'fill-asset'} strokeWidth={last ? 2 : 0} />
                {labelled(index) && (
                <text
                  x={x(index)}
                  // A label sits below its point when the next segment climbs, so the line never strikes through it.
                  y={!last && points[index + 1]!.summary.netWorth > point.summary.netWorth ? y(point.summary.netWorth) + 18 : y(point.summary.netWorth) - 10}
                  textAnchor={anchor} className={last ? 'fill-foreground text-xs font-bold tabular-nums' : 'fill-muted-foreground text-xs tabular-nums'}>
                  {shortMoney(point.summary.netWorth, currency)}
                </text>
                )}
                {dated(index) && (
                  <text x={x(index)} y={H - 8} textAnchor={anchor} className="fill-muted-foreground text-xs tabular-nums">
                    {label(point.snapshot)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      ) : (
        <p className="text-[15px] text-muted-foreground">{t.trend.needMore}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Change title={t.trend.mom} now={now} then={net(previous)} date={previous?.date.slice(2).replaceAll('-', '.')} currency={currency} />
        <Change title={t.trend.yoy} now={now} then={net(lastYear)} date={lastYear?.date.slice(2).replaceAll('-', '.')} currency={currency} />
      </div>
    </div>
  )
}
