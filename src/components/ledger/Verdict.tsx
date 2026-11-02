import { useI18n } from '@/i18n'
import { coverageRange, ratingOf, simulate, summarize, type Rating, type Snapshot, type StressParams } from '@/engine'
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
function stripScale(stress: ReturnType<typeof simulate>) {
  const long = stress.sustainable || stress.capped || stress.monthsCovered > 24
  return long ? { unit: 3, slots: 20, ticks: [1, 30, 60] } : { unit: 1, slots: 24, ticks: [1, 12, 24] }
}

/** The signature: the buffer drawn as pills of time, recomputed on every edit. */
export function BufferStrip({ draft, params, compact }: { draft: Snapshot; params: Partial<StressParams>; compact?: boolean }) {
  const { t } = useI18n()
  const stress = simulate(draft, params)
  const { unit, slots } = stripScale(stress)
  const covered = stress.sustainable || stress.capped ? slots * unit : stress.monthsCovered
  const cashMonths = Math.min(stress.sellInvestmentsMonth ? stress.sellInvestmentsMonth - 1 : covered, covered)
  return (
    <div
      className={cn('grid gap-[3px]', unit === 1 ? 'grid-cols-[repeat(24,minmax(0,1fr))]' : 'grid-cols-[repeat(20,minmax(0,1fr))]', compact && 'gap-0.5')}
      role="img"
      aria-label={stress.sustainable ? t.verdict.stripSustainable : t.verdict.stripSummary(stress.monthsCovered, cashMonths)}
    >
      {Array.from({ length: slots }, (_, index) => {
        const end = (index + 1) * unit
        const tone = end <= cashMonths ? 'bg-asset' : end <= covered ? 'bg-asset/35' : 'bg-foreground/8'
        return (
          <span
            key={index}
            className={cn('rounded-full transition-colors duration-300', compact ? 'h-1.5' : 'h-2.5', tone)}
            style={{ transitionDelay: `${index * 12}ms` }}
          />
        )
      })}
    </div>
  )
}

export function StripLegend({ draft, params }: { draft: Snapshot; params: Partial<StressParams> }) {
  const { t } = useI18n()
  const { unit, ticks } = stripScale(simulate(draft, params))
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

export function Verdict({ draft, previous, params }: { draft: Snapshot; previous?: Snapshot; params: Partial<StressParams> }) {
  const { t } = useI18n()
  const summary = summarize(draft)
  const stress = simulate(draft, params)
  const range = coverageRange(draft, params)
  const rating = ratingOf(stress)
  const netWorth = useTween(summary.netWorth)
  const before = previous ? summarize({ ...previous, baseCurrency: draft.baseCurrency }).netWorth : null
  const change = before === null ? null : summary.netWorth - before
  const hasSpending = draft.cashflow.livingExpense > 0 || summary.monthlyDebtPayment > 0
  const months = stress.capped ? '60+' : range.isRange ? `${range.low}–${range.high}` : `${range.low}`

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
      {hasSpending && (
        <div className="grid gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="flex items-baseline gap-2">
              <span className="text-[15px] whitespace-nowrap text-muted-foreground">{t.verdict.cushion}</span>
              <span className="text-[28px] leading-none font-extrabold tabular-nums">
                {stress.sustainable ? t.verdict.sustainable : months}
                {!stress.sustainable && <span className="ml-1 text-[17px] font-bold">{t.verdict.months}</span>}
              </span>
              <InfoTip label={t.verdict.cushion}>{t.verdict.cushionTip}</InfoTip>
            </p>
            <p className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
              <span className={cn('size-2 rounded-full', RATING_DOT[rating])} />
              {t.rating[rating]}
            </p>
          </div>
          <BufferStrip draft={draft} params={params} />
          <StripLegend draft={draft} params={params} />
        </div>
      )}
    </section>
  )
}
