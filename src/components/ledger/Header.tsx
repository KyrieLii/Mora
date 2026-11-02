import type { Snapshot } from '@/engine'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronLeft, Moon, Sun } from 'lucide-react'
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

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
      className="glass-capsule relative grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-transform after:absolute after:-inset-1 active:scale-95"
      onClick={toggle}
    >
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  )
}

/** Title, the review settings beside it, the day/night switch, and a quiet link to the sample. */
export function Header({ draft, title, back, aside, onDraft }: { draft: Snapshot; title: string; back?: { label: string; onClick: () => void }; aside?: ReactNode; onDraft?: (patch: Partial<Snapshot>) => void }) {
  const [open, setOpen] = useState(false)
  const summary = `${draft.scope === 'family' ? '家庭' : '个人'} · ${draft.period === 'year' ? '年度' : '季度'} · ${draft.baseCurrency === 'CNY' ? '人民币' : '美元'}`

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
                aria-label={`盘点设置：${summary}`}
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
          <ThemeToggle />
        </div>
      </div>
      {open && onDraft && (
        <div className="glass grid gap-3 rounded-[1.375rem] p-4">
          <Choice label="口径" value={draft.scope} options={[['family', '家庭'], ['personal', '个人']]} onChange={(scope) => onDraft({ scope })} />
          <Choice label="周期" value={draft.period} options={[['quarter', '季度'], ['year', '年度']]} onChange={(period) => onDraft({ period })} />
          <Choice label="结果币种" value={draft.baseCurrency} options={[['CNY', '人民币'], ['USD', '美元']]} onChange={(baseCurrency) => onDraft({ baseCurrency })} />
          <label className="flex items-center justify-between gap-4">
            <span className="text-[15px] text-muted-foreground">1 美元兑人民币</span>
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <input
                type="number"
                min="0"
                step="0.0001"
                aria-label="美元兑人民币汇率"
                className="glass-capsule h-8 w-24 rounded-full px-3 text-center text-[15px] font-semibold text-foreground tabular-nums outline-none focus:ring-2 focus:ring-ring/40"
                value={draft.usdCny}
                onChange={(event) => {
                  const rate = Number(event.target.value)
                  if (rate > 0) onDraft({ usdCny: rate })
                }}
              />
              {draft.fxDate}
            </span>
          </label>
        </div>
      )}
    </header>
  )
}
