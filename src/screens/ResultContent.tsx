import { Disclosure } from '@/components/ledger/Disclosure'
import { ReportPanel, YearlySummary } from '@/components/ledger/ReportPanel'
import { Verdict } from '@/components/ledger/Verdict'
import { summarize, type Snapshot } from '@/engine'
import { useI18n } from '@/i18n'
import { periodName, shortMoney } from '@/lib/format'

export const sides = {
  paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
  paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
}

export function Records({ history }: { history: Snapshot[] }) {
  const { t } = useI18n()
  if (history.length === 0) return null
  return (
    <Disclosure title={t.ledger.records}>
      <ol className="grid divide-y divide-border/80">
        {[...history].reverse().map((entry, index) => (
          <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="grid">
              <span className="text-[15px] font-semibold">{periodName(entry)}</span>
              <span className="text-[13px] text-muted-foreground">
                {t.ledger.recordLine(history.length - index, entry.date)}
              </span>
            </span>
            <span className="text-[15px] font-bold tabular-nums">{shortMoney(summarize(entry).netWorth, entry.baseCurrency)}</span>
          </li>
        ))}
      </ol>
    </Disclosure>
  )
}

/** The read-only result: verdict, report and saved reviews. Shared by the mobile result page and the sample. */
export function ResultContent({ draft, previous, history }: { draft: Snapshot; previous?: Snapshot; history: Snapshot[] }) {
  return (
    <>
      <YearlySummary draft={draft} />
      <Verdict draft={draft} previous={previous} />
      <ReportPanel draft={draft} previous={previous} history={history} />
      <Records history={history} />
    </>
  )
}
