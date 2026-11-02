import { Switch } from '@/components/ui/switch'
import { CATEGORIES, toBase, type Currency, type Group, type Item, type Snapshot } from '@/engine'
import { useI18n } from '@/i18n'
import { displayName } from '@/i18n/names'
import { money, shortMoney, signed } from '@/lib/format'
import { categoryIcon, GROUP_ICONS } from '@/lib/icons'
import { newItem } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ChevronDown, PenLine, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AmountInput } from './AmountInput'
import { InfoTip } from './InfoTip'

export function Segmented<T extends string>({ value, options, label, onChange }: { value: T; options: [T, string][]; label: string; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="glass-capsule inline-flex rounded-full p-0.5">
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={cn(
            'h-8 min-w-11 rounded-full px-3 text-sm font-semibold transition-colors',
            value === id ? 'bg-popover text-foreground shadow-[0_1px_3px_oklch(0.3_0.04_200/0.16)]' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function ItemRow({
  item,
  last,
  draft,
  properties,
  readOnly,
  tile,
  onChange,
  onRemove,
}: {
  tile: string
  item: Item
  last?: Item
  draft: Snapshot
  properties: Item[]
  readOnly?: boolean
  onChange: (patch: Partial<Item>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const isLiability = CATEGORIES.find((entry) => entry.id === item.category)?.group === 'liability'
  const categoryDef = CATEGORIES.find((entry) => entry.id === item.category)
  const category = t.categories[item.category] ?? categoryDef?.label ?? ''
  const name = displayName(t, item, 'categories')
  const change = last && last.currency === item.currency && last.amount !== item.amount ? item.amount - last.amount : null
  const Icon = categoryIcon(item.category)
  const note = [
    !categoryDef?.generic && category !== name ? category : '',
    item.isEstimate ? t.sheet.estimate : '',
    item.monthlyPayment ? t.sheet.monthlyPaymentNote(shortMoney(item.monthlyPayment, item.currency)) : '',
    item.monthlyRent ? t.sheet.monthlyRentNote(shortMoney(item.monthlyRent, item.currency)) : '',
    item.currency !== draft.baseCurrency && item.amount
      ? `≈ ${shortMoney(toBase(item.amount, item.currency, draft.baseCurrency, draft.usdCny), draft.baseCurrency)}`
      : '',
  ].filter(Boolean)

  return (
    <li className="px-2">
      <div className="flex items-start gap-1 py-2">
        <span className={cn('mt-0.5 ml-1.5 grid size-8 shrink-0 place-items-center rounded-[0.7rem]', tile)} aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <div className="grid min-w-0 flex-1 pt-0.5">
          <input
            aria-label={t.common.name}
            readOnly={readOnly}
            className="w-full min-w-0 text-ellipsis rounded-lg bg-transparent px-2 py-1 text-[16px] font-medium outline-none transition-colors hover:bg-muted/70 focus:bg-muted focus:ring-2 focus:ring-ring/40"
            value={name}
            onChange={(event) => onChange({ name: event.target.value })}
            onBlur={(event) => !event.target.value.trim() && onChange({ name: category })}
          />
          {note.length > 0 && <span className="px-2 text-[13px] text-muted-foreground">{note.join(' · ')}</span>}
        </div>
        <div className="grid justify-items-end">
          <AmountInput
            id={`amount-${item.id}`}
            value={item.amount}
            currency={item.currency}
            label={`${name} ${isLiability ? t.sheet.balance : t.sheet.amount}`}
            readOnly={readOnly}
            className={cn(item.isEstimate && 'underline decoration-dotted decoration-2 underline-offset-[5px]')}
            onCommit={(amount) => onChange({ amount })}
          />
          {last && (
            <span className={cn('px-2 text-[13px] tabular-nums', change === null ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
              {change === null ? t.common.unchanged : t.common.vsLast(signed(change, (value) => shortMoney(value, item.currency)))}
            </span>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? t.common.collapse(name) : t.common.expand(name)}
            className="relative mt-0.5 -ml-1 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-1.5 hover:bg-muted hover:text-foreground"
            onClick={() => setOpen(!open)}
          >
            <ChevronDown className={cn('size-4.5 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {open && (
        <div className="mx-2 mb-3 grid gap-3 rounded-[1rem] border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted-foreground">{t.common.currency}</span>
            <Segmented value={item.currency} label={t.common.currency} options={[['CNY', t.common.cny], ['USD', t.common.usd]]} onChange={(currency: Currency) => onChange({ currency })} />
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center text-muted-foreground">
              {t.sheet.estimateLabel}
              <InfoTip label={t.sheet.estimate}>{t.sheet.estimateTip}</InfoTip>
            </span>
            <Switch checked={!!item.isEstimate} onCheckedChange={(checked) => onChange({ isEstimate: checked })} />
          </label>
          {isLiability && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t.sheet.monthlyPayment}</span>
              <AmountInput id={`payment-${item.id}`} value={item.monthlyPayment ?? 0} currency={item.currency} label={`${name} ${t.sheet.monthlyPayment}`} onCommit={(monthlyPayment) => onChange({ monthlyPayment })} />
            </div>
          )}
          {isLiability && properties.length > 0 && (
            <label className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t.sheet.linkedProperty}</span>
              <select
                className="h-9 max-w-44 rounded-full border bg-popover px-3 text-sm"
                value={item.linkedAssetId ?? ''}
                onChange={(event) => onChange({ linkedAssetId: event.target.value || undefined })}
              >
                <option value="">{t.sheet.noLink}</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {displayName(t, property, 'categories')}
                  </option>
                ))}
              </select>
            </label>
          )}
          {item.category === 'rental' && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t.sheet.monthlyRent}</span>
              <AmountInput id={`rent-${item.id}`} value={item.monthlyRent ?? 0} currency={item.currency} label={`${name} ${t.sheet.monthlyRent}`} onCommit={(monthlyRent) => onChange({ monthlyRent })} />
            </div>
          )}
          <button type="button" className="flex items-center gap-1.5 justify-self-start rounded-full px-2 py-1 font-semibold text-destructive hover:bg-destructive/10" onClick={onRemove}>
            <Trash2 className="size-4" />
            {t.common.remove}
          </button>
        </div>
      )}
    </li>
  )
}

export function GroupSheet({
  group,
  draft,
  previous,
  readOnly,
  onDraft,
}: {
  group: Group
  draft: Snapshot
  previous?: Snapshot
  readOnly?: boolean
  onDraft: (patch: Partial<Snapshot>) => void
}) {
  const [adding, setAdding] = useState<false | 'pick' | 'custom'>(false)
  const [customName, setCustomName] = useState('')
  const { t } = useI18n()
  const label = t.groups[group]
  const GroupIcon = GROUP_ICONS[group]
  const tint = group === 'liability' ? { tile: 'bg-liability-soft text-liability', text: 'text-liability', hover: 'hover:bg-liability-soft' } : { tile: 'bg-asset-soft text-asset', text: 'text-asset', hover: 'hover:bg-asset-soft' }
  const categories = CATEGORIES.filter((entry) => entry.group === group)
  const items = draft.items.filter((item) => categories.some((entry) => entry.id === item.category))
  const total = items.reduce((sum, item) => sum + toBase(item.amount, item.currency, draft.baseCurrency, draft.usdCny), 0)
  const previousById = new Map(previous?.items.map((item) => [item.id, item]))
  const properties = draft.items.filter((item) => CATEGORIES.find((entry) => entry.id === item.category)?.group === 'fixed')

  const update = (id: string, patch: Partial<Item>) =>
    onDraft({ items: draft.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) })

  const choices = categories.filter((entry) => !entry.generic)
  const genericId = categories.find((entry) => entry.generic)!.id

  const add = (category: string, name?: string) => {
    const item = newItem(category, draft.baseCurrency, name ?? t.categories[category])
    onDraft({ items: [...draft.items, item] })
    setAdding(false)
    setCustomName('')
    requestAnimationFrame(() => document.getElementById(`amount-${item.id}`)?.focus())
  }

  return (
    <section aria-labelledby={`group-${group}`} className={cn('glass rounded-[1.375rem] py-2', group === 'liability' ? 'glass-liability' : 'glass-asset')}>
      <header className="flex items-center justify-between gap-3 px-4 pt-2 pb-1">
        <h2 id={`group-${group}`} className="flex items-center gap-2 text-[17px] font-bold">
          <GroupIcon className={cn('size-4.5', tint.text)} aria-hidden="true" />
          {label}
          <InfoTip label={label}>{t.groupHints[group]}</InfoTip>
        </h2>
        <span className={cn('text-[15px] font-bold whitespace-nowrap tabular-nums', tint.text)}>
          {group === 'liability' && total > 0 ? '-' : ''}
          {money(total, draft.baseCurrency)}
        </span>
      </header>
      <ul className="divide-y divide-border/70">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            last={previousById.get(item.id)}
            draft={draft}
            properties={properties}
            readOnly={readOnly}
            tile={tint.tile}
            onChange={(patch) => update(item.id, patch)}
            onRemove={() => onDraft({ items: draft.items.filter((entry) => entry.id !== item.id) })}
          />
        ))}
      </ul>
      {!readOnly && (
        <div className="px-2 pt-1">
          {adding === 'pick' && (
            <div className="flex flex-wrap gap-2 px-2 py-2">
              {choices.map((category) => (
                <button key={category.id} type="button" className="glass-capsule h-9 rounded-full px-3.5 text-sm font-semibold transition-colors hover:bg-action hover:text-action-foreground" onClick={() => add(category.id)}>
                  {t.categories[category.id] ?? category.label}
                </button>
              ))}
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                onClick={() => setAdding('custom')}
              >
                <PenLine className="size-4" />
                {t.common.custom}
              </button>
              <button type="button" className="h-9 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground" onClick={() => setAdding(false)}>
                {t.common.cancel}
              </button>
            </div>
          )}
          {adding === 'custom' && (
            <form
              className="flex items-center gap-2 px-2 py-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (customName.trim()) add(genericId, customName.trim())
              }}
            >
              <input
                autoFocus
                aria-label={t.sheet.customName(label)}
                placeholder={t.sheet.customPlaceholder}
                enterKeyHint="done"
                className="glass-capsule h-10 min-w-0 flex-1 rounded-full px-4 text-[16px] outline-none focus:ring-2 focus:ring-ring/40"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && setAdding('pick')}
              />
              <button type="submit" disabled={!customName.trim()} className="h-10 rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-35">
                {t.common.add}
              </button>
              <button type="button" className="h-10 rounded-full px-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setAdding('pick')}>
                {t.common.back}
              </button>
            </form>
          )}
          {!adding && (
            <button
              type="button"
              className={cn('flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-[15px] font-semibold transition-colors', tint.text, tint.hover)}
              onClick={() => setAdding('pick')}
            >
              <Plus className="size-4.5" />
              {t.sheet.add(label)}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
