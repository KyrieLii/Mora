import { Header } from '@/components/ledger/Header'
import { samplePrevious, sampleCurrent, sampleYearAgo } from '../sample'
import { ResultContent, sides } from './Ledger'

/** A read-only result for a fictional household, so people see what a finished review looks like. */
export function Example({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl pb-10" style={sides}>
      <main className="grid gap-5 pt-[max(20px,calc(env(safe-area-inset-top,0px)+12px))]">
        <Header draft={sampleCurrent} title="示例结果" back={{ label: '回到我的盘点', onClick: onBack }} />
        <ResultContent draft={sampleCurrent} previous={samplePrevious} history={[sampleYearAgo, samplePrevious]} params={{}} />
      </main>
    </div>
  )
}
