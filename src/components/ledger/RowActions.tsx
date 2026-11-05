import type { Currency } from '@/engine'
import { useI18n } from '@/i18n'
import { symbol } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

export const ROW_CONTROL = 'grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'

export function RowActions({ currency, onCurrencyChange, onRemove, children }: { currency: Currency; onCurrencyChange: (currency: Currency) => void; onRemove: () => void; children?: ReactNode }) {
  const { t } = useI18n()
  const isCny = currency === 'CNY'
  const nextCurrency = isCny ? 'USD' : 'CNY'
  const currencyLabel = t.sheet.switchCurrency(isCny ? t.common.cny : t.common.usd, isCny ? t.common.usd : t.common.cny)

  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        className={cn(ROW_CONTROL, 'text-[16px] font-semibold tabular-nums')}
        aria-label={currencyLabel}
        title={currencyLabel}
        onClick={() => onCurrencyChange(nextCurrency)}
      >
        {symbol(currency)}
      </button>
      {children}
      <button type="button" className={cn(ROW_CONTROL, 'hover:bg-destructive/10 hover:text-destructive')} aria-label={t.common.remove} title={t.common.remove} onClick={onRemove}>
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
