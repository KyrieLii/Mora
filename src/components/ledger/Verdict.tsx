import { RATING_LABELS, coverageRange, ratingOf, simulate, summarize, type Rating, type Snapshot, type StressParams } from '@/engine'
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
  return long ? { unit: 3, slots: 20, ticks: ['1 月', '30 月', '60 月'] } : { unit: 1, slots: 24, ticks: ['1 月', '12 月', '24 月'] }
}

/** The signature: the buffer drawn as pills of time, recomputed on every edit. */
export function BufferStrip({ draft, params, compact }: { draft: Snapshot; params: Partial<StressParams>; compact?: boolean }) {
  const stress = simulate(draft, params)
  const { unit, slots } = stripScale(stress)
  const covered = stress.sustainable || stress.capped ? slots * unit : stress.monthsCovered
  const cashMonths = Math.min(stress.sellInvestmentsMonth ? stress.sellInvestmentsMonth - 1 : covered, covered)
  return (
    <div
      className={cn('grid gap-[3px]', unit === 1 ? 'grid-cols-[repeat(24,minmax(0,1fr))]' : 'grid-cols-[repeat(20,minmax(0,1fr))]', compact && 'gap-0.5')}
      role="img"
      aria-label={stress.sustainable ? '安全垫可持续：其他收入足以覆盖支出' : `安全垫共 ${stress.monthsCovered} 个月：前 ${cashMonths} 个月用现金，之后卖出投资`}
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
  const { unit, ticks } = stripScale(simulate(draft, params))
  return (
    <div className="grid gap-1.5 text-xs text-muted-foreground">
      <p className="flex justify-between tabular-nums">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </p>
      <p className="flex flex-wrap gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5"><i className="h-2 w-3 rounded-full bg-asset" />用现金</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-3 rounded-full bg-asset/35" />卖出投资后</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-3 rounded-full bg-foreground/8" />资金用尽</span>
        <span className="ml-auto">每格 {unit === 1 ? '1 个月' : '3 个月'}</span>
      </p>
    </div>
  )
}

export function Verdict({ draft, previous, params }: { draft: Snapshot; previous?: Snapshot; params: Partial<StressParams> }) {
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
    <section aria-label="盘点结论" className="glass grid gap-5 rounded-[1.75rem] p-5">
      <div className="grid gap-1">
        <p className="text-[15px] text-muted-foreground">{draft.scope === 'family' ? '家庭' : '个人'}净资产</p>
        <p className="text-[clamp(2.5rem,10vw,3.25rem)] leading-[1.05] font-extrabold tracking-[-0.03em] tabular-nums" aria-live="polite">
          {money(netWorth, draft.baseCurrency)}
        </p>
        {change !== null && (
          <p className="flex items-center gap-1 text-[15px] font-semibold tabular-nums">
            {change >= 0 ? <ArrowUpRight className="size-4.5 text-gain" /> : <ArrowDownRight className="size-4.5 text-loss" />}
            较上次{change >= 0 ? '多' : '少'} {shortMoney(Math.abs(change), draft.baseCurrency)}
            <span className="font-normal text-muted-foreground">· {previous?.date}</span>
          </p>
        )}
      </div>

      {/* The cushion appears once monthly spending is known; until then the card shows net worth only. */}
      {hasSpending && (
        <div className="grid gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-baseline gap-2">
              <span className="text-[15px] text-muted-foreground">安全垫</span>
              <span className="text-[28px] leading-none font-extrabold tabular-nums">
                {stress.sustainable ? '可持续' : months}
                {!stress.sustainable && <span className="ml-1 text-[17px] font-bold">个月</span>}
              </span>
              <InfoTip label="安全垫">主要收入中断后，先用现金，再按下跌 30% 后的市值卖出投资，家里还能维持的月数。</InfoTip>
            </p>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <span className={cn('size-2 rounded-full', RATING_DOT[rating])} />
              {RATING_LABELS[rating]}
            </p>
          </div>
          <BufferStrip draft={draft} params={params} />
          <StripLegend draft={draft} params={params} />
        </div>
      )}
    </section>
  )
}
