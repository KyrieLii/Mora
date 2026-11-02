import { RATING_LABELS, ratingOf, simulate, summarize, type Snapshot, type StressParams } from '@/engine'
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

/** Read-only results: structure, trend and the yearly card. */
export function ReportPanel({ draft, previous, history, params }: { draft: Snapshot; previous?: Snapshot; history: Snapshot[]; params: Partial<StressParams> }) {
  const currency = draft.baseCurrency
  const short = (value: number) => shortMoney(value, currency)
  const summary = summarize(draft)
  const stress = simulate(draft, params)
  const hasSpending = draft.cashflow.livingExpense > 0 || summary.monthlyDebtPayment > 0
  const total = Math.max(summary.totalAssets, 1)
  const parts = [
    { label: '现金', value: summary.byGroup.cash, tone: 'bg-asset' },
    { label: '投资', value: summary.byGroup.investment, tone: 'bg-asset/70' },
    { label: '固定资产', value: summary.byGroup.fixed, tone: 'bg-asset/45' },
    { label: '受限', value: summary.byGroup.restricted, tone: 'bg-asset/25' },
    { label: '其他', value: summary.byGroup.other, tone: 'bg-asset/12' },
  ].filter((part) => part.value > 0)

  if (summary.totalAssets === 0 && summary.totalLiabilities === 0) {
    return <p className="glass rounded-[1.375rem] p-4 text-[15px] text-muted-foreground">填入第一笔金额后，这里会出现资产结构和变化趋势。</p>
  }

  return (
    <div className="grid gap-4">
      <Section title="资产与负债">
        <div className="grid gap-2">
          <p className="text-[13px] font-semibold text-asset">资产 {short(summary.totalAssets)}</p>
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
              <span className="text-liability">负债 {short(summary.totalLiabilities)}</span>
              <span className="text-asset">净资产 {short(summary.netWorth)}</span>
            </p>
            <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`负债占资产 ${percent(summary.totalLiabilities / total)}`}>
              <span className="bg-liability/80" style={{ flexGrow: summary.totalLiabilities }} />
              <span className="bg-asset" style={{ flexGrow: Math.max(summary.netWorth, 0) }} />
            </div>
          </div>
        )}
        <div className="grid gap-1 border-t border-border pt-3">
          <Rows rows={[['流动资产占比', percent(summary.liquidRatio), '现金和投资这类能较快变现的资产，占总资产的比例。']]} />
          <Rows
            rows={[
              ['每月结余', short(summary.monthlySurplus), '每月收入减去生活支出和还贷。'],
              ['结余率', percent(summary.savingsRate), '每月能存下的比例。'],
              ['还贷占收入', percent(summary.debtRatio), '超过 30% 时，还款压力偏大。'],
            ]}
          />
        </div>
      </Section>

      <Section title="净资产趋势" tip="环比对比上次盘点，同比对比约一年前的那次盘点。">
        <TrendChart draft={draft} previous={previous} history={history} />
      </Section>

      {draft.period === 'year' && hasSpending && (
        <Section title="年报卡片" tip="分享时只显示等级和比例，不显示金额。">
          <div className="liquid-action grid gap-3 rounded-[1.375rem] p-5">
            <span className="text-[28px] font-extrabold">{RATING_LABELS[ratingOf(stress)]}</span>
            <span className="text-[15px]">
              每月能存下 {percent(summary.savingsRate)} · 能较快变现的资产 {percent(summary.liquidRatio)}
            </span>
            <span className="text-[13px] opacity-80">{draft.date.slice(0, 4)} 家庭财务盘点</span>
          </div>
        </Section>
      )}

    </div>
  )
}
