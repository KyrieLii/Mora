import { FlowSheet } from '@/components/ledger/FlowSheet'
import { GroupSheet } from '@/components/ledger/GroupSheet'
import { Header } from '@/components/ledger/Header'
import { InsuranceSheet } from '@/components/ledger/InsuranceSheet'
import { ReportPanel, YearlySummary } from '@/components/ledger/ReportPanel'
import { BufferStrip, Verdict } from '@/components/ledger/Verdict'
import { GROUPS, calculateCushion, summarize, type Snapshot } from '@/engine'
import { shortMoney } from '@/lib/format'
import { useMediaQuery } from '@/lib/hooks'
import { Records, ResultContent, sides } from '@/screens/ResultContent'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, ScanText } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'

// The provider SDK is only needed once someone opens import, so it stays out of the first load.
const ImportDialog = lazy(() => import('@/components/ledger/ImportDialog').then((module) => ({ default: module.ImportDialog })))

const ACTION_CLASS =
  'liquid-action h-[54px] w-full rounded-full text-[17px] font-bold transition-transform active:scale-[0.98] disabled:opacity-40'

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
  savedNote,
  headerAside,
  onDraft,
  onSave,
}: {
  draft: Snapshot
  previous?: Snapshot
  history: Snapshot[]
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
  const cushion = calculateCushion(draft, summary)
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
          <YearlySummary draft={draft} />
          {/* Only the verdict stays pinned; the report scrolls with the page. */}
          <div className="sticky top-4 z-10 pb-4 [&_section]:bg-(--glass-strong)">
            <Verdict draft={draft} previous={previous} showRating={false} />
          </div>
          <ReportPanel draft={draft} previous={previous} history={history} />
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
          <ResultContent draft={draft} previous={previous} history={history} />
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
          {cushion && <span>{t.ledger.barCushion(cushion.capped ? '60+' : String(cushion.monthsCovered))}</span>}
        </div>
        {cushion && <BufferStrip stress={cushion} compact />}
      </div>

      <main className="grid gap-5 pt-[max(20px,calc(env(safe-area-inset-top,0px)+12px))]">
        {header}
        {notice}
        <div ref={verdictRef}>
          <Verdict draft={draft} previous={previous} showRating={false} />
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
