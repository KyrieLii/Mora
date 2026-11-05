import { useI18n } from '@/i18n'
import { calculateCushion, ratingOf, summarize, type Rating, type SafetyCushion, type Snapshot } from '@/engine'
import { money, shortMoney } from '@/lib/format'
import { useTween } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { InfoTip } from './InfoTip'

const RATING_DOT: Record<Rating, string> = {
  tight: 'bg-loss',
  moderate: 'bg-caution',
  ample: 'bg-gain',
}

/** Up to two years each pill is a month; beyond that each pill is a quarter, out to five years. */
function stripScale(stress: SafetyCushion) {
  const long = stress.capped || stress.monthsCovered > 24
  return long ? { unit: 3, slots: 20, ticks: [1, 30, 60] } : { unit: 1, slots: 24, ticks: [1, 12, 24] }
}

/** The signature: the buffer drawn as pills of time, recomputed on every edit. */
export function BufferStrip({ stress, compact }: { stress: SafetyCushion; compact?: boolean }) {
  const { t } = useI18n()
  const { unit, slots } = stripScale(stress)
  const { monthsCovered: covered, cashMonths } = stress
  return (
    <div
      className={cn('grid gap-[3px]', unit === 1 ? 'grid-cols-[repeat(24,minmax(0,1fr))]' : 'grid-cols-[repeat(20,minmax(0,1fr))]', compact && 'gap-0.5')}
      role="img"
      aria-label={t.verdict.stripSummary(stress.capped ? '60+' : String(covered), cashMonths, covered - cashMonths)}
    >
      {Array.from({ length: slots }, (_, index) => {
        const start = index * unit
        const cash = Math.min(unit, Math.max(0, cashMonths - start))
        const funded = Math.min(unit, Math.max(0, covered - start))
        return (
          <span key={index} className={cn('flex overflow-hidden rounded-full bg-foreground/8', compact ? 'h-1.5' : 'h-2.5')}>
            <span className="bg-asset" style={{ width: `${cash / unit * 100}%` }} />
            <span className="bg-asset/35" style={{ width: `${(funded - cash) / unit * 100}%` }} />
          </span>
        )
      })}
    </div>
  )
}

function StripLegend({ stress }: { stress: SafetyCushion }) {
  const { t } = useI18n()
  const { unit, ticks } = stripScale(stress)
  return (
    <div className="grid gap-1.5 text-xs text-muted-foreground">
      <p className="flex justify-between tabular-nums">
        {ticks.map((tick) => (
          <span key={tick}>{t.verdict.tick(tick)}</span>
        ))}
      </p>
      <p className="flex flex-wrap gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5"><i className="h-2 w-3 rounded-full bg-asset" />{t.verdict.legendCash}</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-3 rounded-full bg-asset/35" />{t.verdict.legendInvest}</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-3 rounded-full bg-foreground/8" />{t.verdict.legendEmpty}</span>
        <span className="ml-auto">{t.verdict.perCell(unit)}</span>
      </p>
    </div>
  )
}

export function Verdict({ draft, previous, showRating = true }: { draft: Snapshot; previous?: Snapshot; showRating?: boolean }) {
  const { t } = useI18n()
  const summary = summarize(draft)
  const cushion = calculateCushion(draft, summary)
  const rating = cushion && ratingOf(cushion.monthsCovered)
  const netWorth = useTween(summary.netWorth)
  const before = previous ? summarize({ ...previous, baseCurrency: draft.baseCurrency }).netWorth : null
  const change = before === null ? null : summary.netWorth - before

  return (
    <section aria-label={t.verdict.region} className="glass grid gap-5 rounded-[1.75rem] p-5">
      <div className="grid gap-1">
        <p className="text-[15px] text-muted-foreground">{t.verdict.netWorth(draft.scope)}</p>
        <p className="text-[clamp(2.5rem,10vw,3.25rem)] leading-[1.05] font-extrabold tracking-[-0.03em] tabular-nums" aria-live="polite">
          {money(netWorth, draft.baseCurrency)}
        </p>
        {change !== null && (
          <p className="flex items-center gap-1 text-[15px] font-semibold tabular-nums">
            {change >= 0 ? <ArrowUpRight className="size-4.5 text-gain" /> : <ArrowDownRight className="size-4.5 text-loss" />}
            {t.verdict.change(change >= 0, shortMoney(Math.abs(change), draft.baseCurrency))}
            <span className="font-normal text-muted-foreground">· {previous?.date}</span>
          </p>
        )}
      </div>

      {/* The cushion appears once monthly spending is known; until then the card shows net worth only. */}
      {cushion && (
        <div className="grid gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1" aria-live="polite">
            <p className="flex items-baseline gap-2">
              <span className="text-[15px] whitespace-nowrap text-muted-foreground">{t.verdict.cushion}</span>
              <span className="text-[28px] leading-none font-extrabold tabular-nums">
                {cushion.capped ? '60+' : cushion.monthsCovered}
                <span className="ml-1 text-[17px] font-bold">{t.verdict.months}</span>
              </span>
              <InfoTip label={t.verdict.cushion}>{t.verdict.cushionTip}</InfoTip>
            </p>
            {showRating && rating && (
              <p className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
                <span className={cn('size-2 rounded-full', RATING_DOT[rating])} />
                {t.rating[rating]}
              </p>
            )}
          </div>
          <BufferStrip stress={cushion} />
          <StripLegend stress={cushion} />
        </div>
      )}
    </section>
  )
}
