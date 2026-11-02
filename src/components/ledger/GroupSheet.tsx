import { Switch } from '@/components/ui/switch'
import { CATEGORIES, GROUPS, toBase, type Currency, type Group, type Item, type Snapshot } from '@/engine'
import { money, shortMoney, signed } from '@/lib/format'
import { categoryIcon, GROUP_ICONS } from '@/lib/icons'
import { newItem } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ChevronDown, PenLine, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AmountInput } from './AmountInput'
import { InfoTip } from './InfoTip'

const HINTS: Record<Group, string> = {
  cash: '随时能用的钱：存款、余额宝、零钱',
  investment: '股票、基金等，按当前市值填',
  fixed: '房子、车位、车，按现在能卖的价格估',
  restricted: '公积金、养老金，算进净资产，不算进安全垫',
  other: '借出去的钱、公司股权等',
  liability: '要还的钱：填剩余本金，展开可填每月还款',
}

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
  const isLiability = CATEGORIES.find((entry) => entry.id === item.category)?.group === 'liability'
  const categoryDef = CATEGORIES.find((entry) => entry.id === item.category)
  const category = categoryDef?.label ?? ''
  const change = last && last.currency === item.currency && last.amount !== item.amount ? item.amount - last.amount : null
  const Icon = categoryIcon(item.category)
  const note = [
    !categoryDef?.generic && category !== item.name ? category : '',
    item.isEstimate ? '估算' : '',
    item.monthlyPayment ? `月还 ${shortMoney(item.monthlyPayment, item.currency)}` : '',
    item.monthlyRent ? `月租 ${shortMoney(item.monthlyRent, item.currency)}` : '',
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
            aria-label="名称"
            readOnly={readOnly}
            className="w-full min-w-0 text-ellipsis rounded-lg bg-transparent px-2 py-1 text-[16px] font-medium outline-none transition-colors hover:bg-muted/70 focus:bg-muted focus:ring-2 focus:ring-ring/40"
            value={item.name}
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
            label={`${item.name}${isLiability ? '剩余本金' : '金额'}`}
            readOnly={readOnly}
            className={cn(item.isEstimate && 'underline decoration-dotted decoration-2 underline-offset-[5px]')}
            onCommit={(amount) => onChange({ amount })}
          />
          {last && (
            <span className={cn('px-2 text-[13px] tabular-nums', change === null ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
              {change === null ? '未变' : `较上次 ${signed(change, (value) => shortMoney(value, item.currency))}`}
            </span>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? `收起${item.name}的设置` : `展开${item.name}的设置`}
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
            <span className="text-muted-foreground">币种</span>
            <Segmented value={item.currency} label="币种" options={[['CNY', '人民币'], ['USD', '美元']]} onChange={(currency: Currency) => onChange({ currency })} />
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center text-muted-foreground">
              这是估算值
              <InfoTip label="估算值">拿不准的金额标成估算，安全垫会显示为一个月数范围。</InfoTip>
            </span>
            <Switch checked={!!item.isEstimate} onCheckedChange={(checked) => onChange({ isEstimate: checked })} />
          </label>
          {isLiability && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">每月还款</span>
              <AmountInput id={`payment-${item.id}`} value={item.monthlyPayment ?? 0} currency={item.currency} label={`${item.name}每月还款`} onCommit={(monthlyPayment) => onChange({ monthlyPayment })} />
            </div>
          )}
          {isLiability && properties.length > 0 && (
            <label className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">对应房产</span>
              <select
                className="h-9 max-w-44 rounded-full border bg-popover px-3 text-sm"
                value={item.linkedAssetId ?? ''}
                onChange={(event) => onChange({ linkedAssetId: event.target.value || undefined })}
              >
                <option value="">不关联</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {item.category === 'rental' && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">每月租金</span>
              <AmountInput id={`rent-${item.id}`} value={item.monthlyRent ?? 0} currency={item.currency} label={`${item.name}每月租金`} onCommit={(monthlyRent) => onChange({ monthlyRent })} />
            </div>
          )}
          <button type="button" className="flex items-center gap-1.5 justify-self-start rounded-full px-2 py-1 font-semibold text-destructive hover:bg-destructive/10" onClick={onRemove}>
            <Trash2 className="size-4" />
            删除这一项
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
  const label = GROUPS.find((entry) => entry.id === group)!.label
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
    const item = newItem(category, draft.baseCurrency, name)
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
          <InfoTip label={label}>{HINTS[group]}</InfoTip>
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
                  {category.label}
                </button>
              ))}
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                onClick={() => setAdding('custom')}
              >
                <PenLine className="size-4" />
                自定义
              </button>
              <button type="button" className="h-9 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground" onClick={() => setAdding(false)}>
                取消
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
                aria-label={`自定义${label}的名称`}
                placeholder="名称，比如 招行理财"
                enterKeyHint="done"
                className="glass-capsule h-10 min-w-0 flex-1 rounded-full px-4 text-[16px] outline-none focus:ring-2 focus:ring-ring/40"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && setAdding('pick')}
              />
              <button type="submit" disabled={!customName.trim()} className="h-10 rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-35">
                添加
              </button>
              <button type="button" className="h-10 rounded-full px-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setAdding('pick')}>
                返回
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
              添加{label}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
