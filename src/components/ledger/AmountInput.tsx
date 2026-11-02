import { money, parseAmount, symbol } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Currency } from '@/engine'
import { useI18n } from '@/i18n'
import { useState } from 'react'

/**
 * Edits an amount in place with the system number keyboard.
 * Shows the formatted value at rest and accepts 1.5万 style input while typing.
 */
export function AmountInput({
  id,
  value,
  currency,
  label,
  placeholder,
  readOnly,
  className,
  onCommit,
}: {
  id: string
  value: number
  currency: Currency
  label: string
  placeholder?: string
  readOnly?: boolean
  className?: string
  onCommit: (value: number) => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<string | null>(null)
  const parsed = draft === null ? value : parseAmount(draft)
  const invalid = draft !== null && parsed === null

  return (
    <span className="grid justify-items-end">
      <input
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        inputMode="decimal"
        enterKeyHint="next"
        autoComplete="off"
        readOnly={readOnly}
        placeholder={placeholder ?? t.common.amountPlaceholder}
        className={cn(
          'w-[7.75rem] rounded-lg sm:w-36 bg-transparent px-2 py-1.5 text-right text-[17px] font-semibold tabular-nums outline-none transition-colors',
          'placeholder:text-[15px] placeholder:font-normal placeholder:text-muted-foreground',
          'hover:bg-muted/70 focus:bg-muted focus:ring-2 focus:ring-ring/40',
          invalid && 'ring-2 ring-destructive/60',
          className,
        )}
        value={draft ?? (value ? money(value, currency) : '')}
        onFocus={(event) => {
          setDraft(value ? String(value) : '')
          requestAnimationFrame(() => event.target.select())
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (parsed !== null && parsed !== value) onCommit(parsed)
          setDraft(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(null)
            requestAnimationFrame(() => event.currentTarget?.blur())
          }
        }}
      />
      {invalid && (
        <span className="px-2 text-xs text-destructive" role="alert">
          {t.common.amountError(`${symbol(currency)}${t.common.amountExample}`)}
        </span>
      )}
    </span>
  )
}
