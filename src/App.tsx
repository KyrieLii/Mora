import type { Snapshot, StressParams } from '@/engine'
import { useI18n } from '@/i18n'
import { emptyState, loadStored, saveStored, today, withDerivedCashflow, type Stored } from '@/lib/store'
import { Example } from '@/screens/Example'
import { Ledger } from '@/screens/Ledger'
import { useEffect, useRef, useState } from 'react'
import { sampleCurrent } from './sample'

const isExampleHash = () => window.location.hash === '#example'

export function App() {
  const rateRef = useRef({ usdCny: sampleCurrent.usdCny, fxDate: sampleCurrent.fxDate })
  const [state, setState] = useState<Stored>(() => loadStored() ?? emptyState(rateRef.current.usdCny, rateRef.current.fxDate))
  const [params] = useState<Partial<StressParams>>({})
  const [example, setExample] = useState(isExampleHash)
  const { t } = useI18n()
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const { draft, history } = state
  const previous = history.filter((entry) => entry.id !== draft.id).at(-1)

  useEffect(() => {
    saveStored(state)
  }, [state])
  useEffect(() => {
    const onHash = () => setExample(isExampleHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [example])
  useEffect(() => {
    fetch('/fx.json')
      .then((response) => response.json())
      .then((fx: { usdCny: number; date: string }) => {
        rateRef.current = { usdCny: fx.usdCny, fxDate: fx.date }
      })
      .catch(() => undefined)
  }, [])

  const updateDraft = (patch: Partial<Snapshot>) => {
    setSavedCount(null)
    setState((current) => ({ ...current, draft: withDerivedCashflow({ ...current.draft, ...patch }) }))
  }

  const save = () => {
    const count = history.length + 1
    setState((current) => ({
      ...current,
      history: [...current.history, current.draft],
      draft: { ...structuredClone(current.draft), id: crypto.randomUUID(), date: today(), ...rateRef.current },
    }))
    setSavedCount(count)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (example) return <Example onBack={() => (window.location.hash = '')} />

  return (
    <Ledger
      draft={draft}
      previous={previous}
      history={history}
      params={params}
      savedNote={savedCount === null ? null : t.ledger.saved(savedCount)}
      onDraft={updateDraft}
      onSave={save}
      headerAside={
        <a href="#example" className="rounded-full px-2 py-1.5 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t.example.link}
        </a>
      }
    />
  )
}
