import type { Snapshot, StressParams } from '@/engine'
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
  const [savedNote, setSavedNote] = useState<string | null>(null)
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
    setSavedNote(null)
    setState((current) => ({ ...current, draft: withDerivedCashflow({ ...current.draft, ...patch }) }))
  }

  const save = () => {
    const count = history.length + 1
    setState((current) => ({
      ...current,
      history: [...current.history, current.draft],
      draft: { ...structuredClone(current.draft), id: crypto.randomUUID(), date: today(), ...rateRef.current },
    }))
    setSavedNote(`已保存第 ${count} 次盘点。下次打开只需修改变化的数字。`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (example) return <Example onBack={() => (window.location.hash = '')} />

  return (
    <Ledger
      draft={draft}
      previous={previous}
      history={history}
      params={params}
      savedNote={savedNote}
      onDraft={updateDraft}
      onSave={save}
      headerAside={
        <a href="#example" className="rounded-full px-2 py-1.5 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          示例
        </a>
      }
    />
  )
}
