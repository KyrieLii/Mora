import type { Snapshot } from '@/engine'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'

const INSURANCE = ['life', 'critical', 'medical', 'none', 'unknown']

/** Yearly reviews ask which policies protect the main earner. */
export function InsuranceSheet({ draft, onDraft }: { draft: Snapshot; onDraft: (patch: Partial<Snapshot>) => void }) {
  const { t } = useI18n()
  const toggle = (id: string) =>
    onDraft({ insurance: draft.insurance.includes(id) ? draft.insurance.filter((entry) => entry !== id) : [...draft.insurance, id] })

  return (
    <section aria-labelledby="insurance" className="glass grid gap-3 rounded-[1.375rem] px-4 py-4">
      <h2 id="insurance" className="flex items-center gap-2 text-[17px] font-bold">
        <ShieldCheck className="size-4.5 text-muted-foreground" aria-hidden="true" />
        {t.insuranceTitle}
      </h2>
      <div className="flex flex-wrap gap-2">
        {INSURANCE.map((id) => {
          const on = draft.insurance.includes(id)
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              className={cn('h-9 rounded-full px-4 text-sm font-semibold transition-colors', on ? 'glass-capsule bg-popover text-foreground shadow-[0_1px_3px_oklch(0.3_0.04_200/0.16)] ring-2 ring-ring/50' : 'glass-capsule text-muted-foreground hover:text-foreground')}
              onClick={() => toggle(id)}
            >
              {t.insurance[id]}
            </button>
          )
        })}
      </div>
    </section>
  )
}
