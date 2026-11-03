import { InfoTip } from '@/components/ledger/InfoTip'
import type { Snapshot } from '@/engine'
import { useI18n } from '@/i18n'
import { FX_SOURCE_HOST, fetchLatestRate } from '@/lib/fx'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronLeft, Moon, RefreshCw, Sun } from 'lucide-react'
import { useState, type ReactNode } from 'react'

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (value: T) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[15px] text-muted-foreground">{label}</span>
      <div role="radiogroup" aria-label={label} className="glass-capsule inline-flex rounded-full p-0.5">
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            className={cn(
              'h-8 rounded-full px-3.5 text-sm font-semibold transition-colors',
              value === id ? 'bg-popover text-foreground shadow-[0_1px_3px_oklch(0.3_0.04_200/0.16)]' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onChange(id)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Switches between Chinese and English; shows the language it switches to. */
export function LanguageToggle() {
  const { t, toggle } = useI18n()
  return (
    <button
      type="button"
      aria-label={t.header.switchLanguage}
      className="glass-capsule relative grid h-9 min-w-9 shrink-0 place-items-center rounded-full px-2.5 text-[13px] font-bold text-foreground transition-transform after:absolute after:-inset-1 active:scale-95"
      onClick={toggle}
    >
      {t.header.otherLanguage}
    </button>
  )
}

export function ThemeToggle() {
  const { t } = useI18n()
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      aria-label={dark ? t.header.toLight : t.header.toDark}
      className="glass-capsule relative grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-transform after:absolute after:-inset-1 active:scale-95"
      onClick={toggle}
    >
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  )
}

/** The USD/RMB rate: edit by hand, or refresh it from a third-party site on request. An empty fxDate marks a hand-entered rate. */
function RateField({ draft, onDraft }: { draft: Snapshot; onDraft: (patch: Partial<Snapshot>) => void }) {
  const { t } = useI18n()
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const refresh = async () => {
    setState('loading')
    try {
      const rate = await fetchLatestRate()
      onDraft({ usdCny: rate.usdCny, fxDate: rate.date })
      setState('idle')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1 text-[15px] text-muted-foreground">
          {t.header.fxLabel}
          <InfoTip label={t.header.fxTipLabel}>{t.header.fxTip(FX_SOURCE_HOST)}</InfoTip>
        </span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            step="0.0001"
            aria-label={t.header.fxAria}
            className="glass-capsule h-8 w-24 rounded-full px-3 text-center text-[15px] font-semibold text-foreground tabular-nums outline-none focus:ring-2 focus:ring-ring/40"
            value={draft.usdCny}
            onChange={(event) => {
              const rate = Number(event.target.value)
              if (rate > 0) onDraft({ usdCny: rate, fxDate: '' })
            }}
          />
          <button
            type="button"
            aria-label={state === 'loading' ? t.header.fxRefreshing : t.header.fxRefresh}
            title={t.header.fxRefresh}
            disabled={state === 'loading'}
            className="relative grid size-8 place-items-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-1.5 hover:bg-muted hover:text-foreground disabled:opacity-60"
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('size-4', state === 'loading' && 'animate-spin')} />
          </button>
        </span>
      </div>
      <p role={state === 'error' ? 'alert' : undefined} className={cn('justify-self-end text-[12px]', state === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
        {state === 'error' ? t.header.fxFailed : draft.fxDate ? t.header.fxAsOf(draft.fxDate) : t.header.fxManual}
      </p>
    </div>
  )
}

/** Title, the review settings beside it, the day/night switch, and a quiet link to the sample. */
export function Header({ draft, title, back, aside, onDraft }: { draft: Snapshot; title: string; back?: { label: string; onClick: () => void }; aside?: ReactNode; onDraft?: (patch: Partial<Snapshot>) => void }) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const summary = t.header.summary(draft.scope, draft.period === 'year', draft.baseCurrency === 'CNY')

  return (
    <header className="grid gap-3">
      {back && (
        <button type="button" className="flex items-center gap-0.5 justify-self-start rounded-full py-1 pr-2 text-[15px] font-semibold" onClick={back.onClick}>
          <ChevronLeft className="size-5 text-primary" />
          {back.label}
        </button>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1.5">
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">{title}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
            {onDraft ? (
              <button
                type="button"
                aria-expanded={open}
                aria-label={t.header.settings(summary)}
                className="glass-capsule flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-foreground"
                onClick={() => setOpen(!open)}
              >
                {summary}
                <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
              </button>
            ) : (
              <span className="font-semibold text-foreground">{summary}</span>
            )}
            <span>{draft.date}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {aside}
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      {open && onDraft && (
        <div className="glass grid gap-3 rounded-[1.375rem] p-4">
          <Choice label={t.header.scope} value={draft.scope} options={[['family', t.header.family], ['personal', t.header.personal]]} onChange={(scope) => onDraft({ scope })} />
          <Choice label={t.header.period} value={draft.period} options={[['quarter', t.header.quarter], ['year', t.header.year]]} onChange={(period) => onDraft({ period })} />
          <Choice label={t.header.baseCurrency} value={draft.baseCurrency} options={[['CNY', t.common.cny], ['USD', t.common.usd]]} onChange={(baseCurrency) => onDraft({ baseCurrency })} />
          <RateField draft={draft} onDraft={onDraft} />
        </div>
      )}
    </header>
  )
}
