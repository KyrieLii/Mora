import { FlowSheet } from '@/components/ledger/FlowSheet'
import { GroupSheet } from '@/components/ledger/GroupSheet'
import { Header } from '@/components/ledger/Header'
import { InsuranceSheet } from '@/components/ledger/InsuranceSheet'
import { ReportPanel } from '@/components/ledger/ReportPanel'
import { BufferStrip, Verdict } from '@/components/ledger/Verdict'
import { GROUPS, simulate, summarize, type Snapshot, type StressParams } from '@/engine'
import { periodName, shortMoney } from '@/lib/format'
import { useMediaQuery } from '@/lib/hooks'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, ScanText } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'

// The provider SDK is only needed once someone opens import, so it stays out of the first load.
const ImportDialog = lazy(() => import('@/components/ledger/ImportDialog').then((module) => ({ default: module.ImportDialog })))

export const sides = {
  paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
  paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
}

const ACTION_CLASS =
  'liquid-action h-[54px] w-full rounded-full text-[17px] font-bold transition-transform active:scale-[0.98] disabled:opacity-40'

function Records({ history }: { history: Snapshot[] }) {
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

function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="glass-capsule fixed inset-x-3 z-30 mx-auto max-w-[calc(36rem-1.5rem)] rounded-full p-1.5" style={{ bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
      {children}
    </div>
  )
}

export function Ledger({
  draft,
  previous,
  history,
  params,
  savedNote,
  headerAside,
  onDraft,
  onSave,
}: {
  draft: Snapshot
  previous?: Snapshot
  history: Snapshot[]
  params: Partial<StressParams>
  savedNote?: string | null
  headerAside?: ReactNode
  onDraft: (patch: Partial<Snapshot>) => void
  onSave: () => void
}) {
  const { t } = useI18n()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [view, setView] = useState<'edit' | 'result'>('edit')
  const [verdictVisible, setVerdictVisible] = useState(true)
  const verdictRef = useRef<HTMLDivElement>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importedNote, setImportedNote] = useState<string | null>(null)
  const summary = summarize(draft)
  const stress = simulate(draft, params)
  const hasSpending = draft.cashflow.livingExpense > 0 || summary.monthlyDebtPayment > 0
  const hasAmounts = draft.items.some((item) => item.amount > 0)

  useEffect(() => {
    const node = verdictRef.current
    if (!node || wide || view !== 'edit') return
    const observer = new IntersectionObserver(([entry]) => setVerdictVisible(entry!.isIntersecting), { rootMargin: '-40px 0px 0px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [wide, view])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  const header = <Header draft={draft} title={t.appName} aside={headerAside} onDraft={onDraft} />

  const noticeText = importedNote ?? savedNote
  const notice = noticeText ? (
    <p role="status" className="flex items-center gap-2 rounded-2xl bg-gain/12 px-4 py-3 text-[15px] font-semibold text-gain">
      <Check className="size-4.5" />
      {noticeText}
    </p>
  ) : null

  const importer = (
    <>
      <button type="button" className="glass flex items-center gap-3 rounded-[1.375rem] px-4 py-3.5 text-left transition-transform active:scale-[0.99]" onClick={() => setImportOpen(true)}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <ScanText className="size-5" />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-[16px] font-bold">{t.importer.entry}</span>
          <span className="text-[13px] leading-snug text-muted-foreground">{t.importer.entryHint}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>
      {importOpen && (
        <Suspense fallback={null}>
          <ImportDialog
            open
            draft={draft}
            onOpenChange={setImportOpen}
            onApply={(patch, count) => {
              onDraft(patch)
              setImportedNote(t.importer.imported(count))
            }}
          />
        </Suspense>
      )}
    </>
  )

  const sheets = (
    <div className="grid gap-4">
      {importer}
      {GROUPS.map((group) => (
        <GroupSheet key={group.id} group={group.id} draft={draft} previous={previous} onDraft={onDraft} />
      ))}
      <FlowSheet kind="income" draft={draft} previous={previous} onDraft={onDraft} />
      <FlowSheet kind="expense" draft={draft} previous={previous} onDraft={onDraft} />
      {draft.period === 'year' && <InsuranceSheet draft={draft} onDraft={onDraft} />}
    </div>
  )

  const saveButton = (
    <button type="button" className={ACTION_CLASS} disabled={!hasAmounts} onClick={onSave}>
      {t.ledger.save}
    </button>
  )

  if (wide) {
    return (
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-[minmax(0,1fr)_400px] gap-10 py-8" style={sides}>
        <main className="grid content-start gap-6">
          {header}
          {notice}
          {sheets}
          <Records history={history} />
          {saveButton}
        </main>
        <aside aria-label={t.ledger.aside} className="grid content-start gap-6 pb-8">
          {/* Only the verdict stays pinned; the report scrolls with the page. */}
          <div className="glass-bar pinned-band sticky top-0 z-10 -mx-3 -mt-8 px-3 pt-8 pb-4 [&_section]:bg-(--glass-strong)">
            <Verdict draft={draft} previous={previous} params={params} />
          </div>
          <ReportPanel draft={draft} previous={previous} history={history} params={params} />
        </aside>
      </div>
    )
  }

  if (view === 'result') {
    return (
      <div className="mx-auto w-full max-w-xl" style={{ ...sides, paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
        <main className="grid gap-5 pt-[max(20px,calc(env(safe-area-inset-top,0px)+12px))]">
          <Header draft={draft} title={t.ledger.resultTitle} back={{ label: t.ledger.backToEdit, onClick: () => setView('edit') }} />
          {notice}
          <ResultContent draft={draft} previous={previous} history={history} params={params} />
        </main>
        <Dock>{saveButton}</Dock>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl" style={{ ...sides, paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <div
        aria-hidden={verdictVisible}
        className={cn(
          'glass-capsule fixed inset-x-3 z-30 mx-auto grid max-w-[calc(36rem-1.5rem)] gap-1.5 rounded-2xl px-4 py-2.5 transition-[opacity,translate] duration-300',
          verdictVisible ? 'pointer-events-none -translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
        )}
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
      >
        <div className="flex items-baseline justify-between text-[15px] font-bold tabular-nums">
          <span>{t.ledger.barNetWorth(shortMoney(summary.netWorth, draft.baseCurrency))}</span>
          {hasSpending && <span>{stress.sustainable ? t.ledger.barSustainable : t.ledger.barCushion(stress.capped ? '60+' : String(stress.monthsCovered))}</span>}
        </div>
        {hasSpending && <BufferStrip draft={draft} params={params} compact />}
      </div>

      <main className="grid gap-5 pt-[max(20px,calc(env(safe-area-inset-top,0px)+12px))]">
        {header}
        {notice}
        <div ref={verdictRef}>
          <Verdict draft={draft} previous={previous} params={params} />
        </div>
        {sheets}
      </main>

      <Dock>
        <button type="button" className={ACTION_CLASS} disabled={!hasAmounts} onClick={() => setView('result')}>
          {t.ledger.viewResult}
        </button>
      </Dock>
    </div>
  )
}
