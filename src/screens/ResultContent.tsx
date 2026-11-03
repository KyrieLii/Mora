import { ReportPanel } from '@/components/ledger/ReportPanel'
import { Verdict } from '@/components/ledger/Verdict'
import { summarize, type Snapshot, type StressParams } from '@/engine'
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
    <section aria-labelledby="records" className="grid gap-2">
      <h2 id="records" className="text-[17px] font-bold">
        {t.ledger.records}
      </h2>
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
    </section>
  )
}

/** The read-only result: verdict, report and saved reviews. Shared by the mobile result page and the sample. */
export function ResultContent({ draft, previous, history, params }: { draft: Snapshot; previous?: Snapshot; history: Snapshot[]; params: Partial<StressParams> }) {
  return (
    <>
      <Verdict draft={draft} previous={previous} params={params} />
      <ReportPanel draft={draft} previous={previous} history={history} params={params} />
      <Records history={history} />
    </>
  )
}
