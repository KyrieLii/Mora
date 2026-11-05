import { useI18n } from '@/i18n'
import { calculateCushion, summarize, yearlyHeadlineTier, type Snapshot } from '@/engine'
import { percent, shortMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { InfoTip } from './InfoTip'
import { TrendChart } from './TrendChart'

function Section({ title, tip, children }: { title: string; tip?: string; children: ReactNode }) {
  return (
    <section className="glass grid gap-3 rounded-[1.375rem] p-4">
      <h3 className="flex items-center gap-1 text-[17px] font-bold">
        {title}
        {tip && <InfoTip label={title}>{tip}</InfoTip>}
      </h3>
      {children}
    </section>
  )
}

function Rows({ rows, tone }: { rows: ([string, string] | [string, string, string])[]; tone?: string }) {
  return (
    <dl className="grid">
      {rows.map(([label, value, hint]) => (
        <div key={label} className="flex items-center justify-between gap-4 py-1 text-[15px]">
          <dt className="flex items-center text-muted-foreground">
            {label}
            {hint && <InfoTip label={label}>{hint}</InfoTip>}
          </dt>
          <dd className={cn('font-semibold tabular-nums', tone)}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Read-only asset structure and trend. */
export function ReportPanel({ draft, previous, history }: { draft: Snapshot; previous?: Snapshot; history: Snapshot[] }) {
  const { t } = useI18n()
  const currency = draft.baseCurrency
  const short = (value: number) => shortMoney(value, currency)
  const summary = summarize(draft)
  const total = Math.max(summary.totalAssets, 1)
  const parts = [
    { label: t.report.parts.cash, value: summary.byGroup.cash, tone: 'bg-asset' },
    { label: t.report.parts.investment, value: summary.byGroup.investment, tone: 'bg-asset/70' },
    { label: t.report.parts.fixed, value: summary.byGroup.fixed, tone: 'bg-asset/45' },
    { label: t.report.parts.restricted, value: summary.byGroup.restricted, tone: 'bg-asset/25' },
    { label: t.report.parts.other, value: summary.byGroup.other, tone: 'bg-asset/12' },
  ].filter((part) => part.value > 0)

  if (summary.totalAssets === 0 && summary.totalLiabilities === 0) {
    return <p className="glass rounded-[1.375rem] p-4 text-[15px] text-muted-foreground">{t.report.empty}</p>
  }

  return (
    <div className="grid gap-4">
      <Section title={t.report.assetsTitle}>
        <div className="grid gap-2">
          <p className="text-[13px] font-semibold text-asset">{t.report.assets(short(summary.totalAssets))}</p>
          <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={parts.map((part) => `${part.label}${percent(part.value / total)}`).join('，')}>
            {parts.map((part) => (
              <span key={part.label} className={part.tone} style={{ flexGrow: part.value }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            {parts.map((part) => (
              <li key={part.label} className="flex items-center gap-1.5">
                <i className={cn('size-2.5 rounded-full', part.tone)} />
                {part.label} {percent(part.value / total)}
              </li>
            ))}
          </ul>
        </div>
        {summary.totalLiabilities > 0 && (
          <div className="grid gap-2">
            <p className="flex justify-between text-[13px] font-semibold">
              <span className="text-liability">{t.report.liabilities(short(summary.totalLiabilities))}</span>
              <span className="text-asset">{t.report.netWorth(short(summary.netWorth))}</span>
            </p>
            <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={t.report.debtShare(percent(summary.totalLiabilities / total))}>
              <span className="bg-liability/80" style={{ flexGrow: summary.totalLiabilities }} />
              <span className="bg-asset" style={{ flexGrow: Math.max(summary.netWorth, 0) }} />
            </div>
          </div>
        )}
        <div className="grid gap-1 border-t border-border pt-3">
          <Rows rows={[[t.report.liquid, percent(summary.liquidRatio), t.report.liquidTip]]} />
          <Rows
            rows={[
              [t.report.surplus, short(summary.monthlySurplus), t.report.surplusTip],
              [t.report.savingsRate, percent(summary.savingsRate), t.report.savingsRateTip],
              [t.report.debtRatio, percent(summary.debtRatio), t.report.debtRatioTip],
            ]}
          />
        </div>
      </Section>

      <Section title={t.report.trendTitle} tip={t.report.trendTip}>
        <TrendChart draft={draft} previous={previous} history={history} />
      </Section>
    </div>
  )
}

export function YearlySummary({ draft }: { draft: Snapshot }) {
  const { t } = useI18n()
  if (draft.period !== 'year') return null
  const summary = summarize(draft)
  if (summary.totalAssets === 0 && summary.totalLiabilities === 0) return null
  const cushion = calculateCushion(draft, summary)
  const tier = yearlyHeadlineTier(cushion?.monthsCovered ?? null, summary.netWorth)
  if (!tier) return null

  return (
    <div className="liquid-action grid gap-3 rounded-[1.375rem] p-5">
      <span className="text-[28px] font-extrabold">{t.report.cardHeadline[tier]}</span>
      {cushion && (
        <span className="text-[15px]">
          {t.report.cardLine(percent(summary.savingsRate), percent(summary.liquidRatio))}
        </span>
      )}
      <span className="text-[13px] opacity-80">{t.report.cardFooter(draft.date.slice(0, 4))}</span>
    </div>
  )
}
