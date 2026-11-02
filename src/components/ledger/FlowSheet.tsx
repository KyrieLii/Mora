import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n'
import { displayName } from '@/i18n/names'
import { FLOW_CATEGORIES, monthlyEquivalent, type Currency, type FlowItem, type FlowKind, type Frequency, type Snapshot } from '@/engine'
import { money, shortMoney, signed } from '@/lib/format'
import { newFlow } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  Building,
  Car,
  ChevronDown,
  CircleDollarSign,
  Gift,
  GraduationCap,
  HandCoins,
  KeyRound,
  type LucideIcon,
  PenLine,
  Plus,
  Receipt,
  Repeat,
  ShieldPlus,
  ShoppingBasket,
  Trash2,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { AmountInput } from './AmountInput'
import { Segmented } from './GroupSheet'
import { InfoTip } from './InfoTip'

const ICONS: Record<string, LucideIcon> = {
  salary: Briefcase,
  quarterBonus: Gift,
  yearBonus: Gift,
  severancePay: HandCoins,
  familyIncome: Users,
  living: ShoppingBasket,
  rent: KeyRound,
  propertyFee: Building,
  carInsurance: Car,
  premium: ShieldPlus,
  subscription: Repeat,
  education: GraduationCap,
  expenseOther: Receipt,
}

function FlowRow({
  flow,
  last,
  draft,
  onChange,
  onRemove,
}: {
  flow: FlowItem
  last?: FlowItem
  draft: Snapshot
  onChange: (patch: Partial<FlowItem>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const def = FLOW_CATEGORIES.find((entry) => entry.id === flow.category)
  const label = t.flowCategories[flow.category] ?? def?.label ?? ''
  const name = displayName(t, flow, 'flowCategories')
  const Icon = ICONS[flow.category] ?? CircleDollarSign
  const isIncome = def?.kind !== 'expense'
  const perMonth = monthlyEquivalent(flow, draft.baseCurrency, draft.usdCny)
  const change = last && last.currency === flow.currency && last.amount !== flow.amount ? flow.amount - last.amount : null
  const note = [
    !def?.generic && label !== name && flow.frequency !== 'once' ? label : '',
    t.frequency[flow.frequency],
    flow.frequency !== 'monthly' && flow.frequency !== 'once' && flow.amount ? t.common.approxPerMonth(shortMoney(perMonth, draft.baseCurrency)) : '',
    isIncome && flow.continues && flow.frequency !== 'once' ? t.flows.continuing : '',
  ].filter(Boolean)

  return (
    <li className="px-2">
      <div className="flex items-start gap-1 py-2">
        <span className="mt-0.5 ml-1.5 grid size-8 shrink-0 place-items-center rounded-[0.7rem] bg-flow-soft text-flow" aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <div className="grid min-w-0 flex-1 pt-0.5">
          <input
            aria-label={t.common.name}
            className="w-full min-w-0 rounded-lg bg-transparent px-2 py-1 text-[16px] font-medium text-ellipsis outline-none transition-colors hover:bg-muted/70 focus:bg-muted focus:ring-2 focus:ring-ring/40"
            value={name}
            onChange={(event) => onChange({ name: event.target.value })}
            onBlur={(event) => !event.target.value.trim() && onChange({ name: label })}
          />
          {/* Each separator rides at the end of the segment before it, so a wrapped line never starts with a dot. */}
          <span className="flex flex-wrap gap-x-1 px-2 text-[13px] text-muted-foreground">
            {note.map((part, index) => (
              <span key={part} className="whitespace-nowrap">
                {part}
                {index < note.length - 1 && ' ·'}
              </span>
            ))}
          </span>
        </div>
        <div className="grid justify-items-end">
          <AmountInput id={`flow-${flow.id}`} value={flow.amount} currency={flow.currency} label={`${name} ${t.sheet.amount}`} className="text-flow" onCommit={(amount) => onChange({ amount })} />
          {last && (
            <span className={cn('px-2 text-[13px] tabular-nums', change === null ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
              {change === null ? t.common.unchanged : t.common.vsLast(signed(change, (value) => shortMoney(value, flow.currency)))}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? t.common.collapse(name) : t.common.expand(name)}
          className="relative mt-0.5 -ml-1 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-1.5 hover:bg-muted hover:text-foreground"
          onClick={() => setOpen(!open)}
        >
          <ChevronDown className={cn('size-4.5 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="mx-2 mb-3 grid gap-3 rounded-[1rem] border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted-foreground">{t.flows.frequency}</span>
            <Segmented
              value={flow.frequency}
              label={t.flows.frequency}
              options={(isIncome ? ['monthly', 'quarterly', 'annual', 'once'] : ['monthly', 'quarterly', 'annual']).map((id) => [id as Frequency, t.frequency[id as Frequency]])}
              onChange={(frequency: Frequency) => onChange({ frequency })}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted-foreground">{t.common.currency}</span>
            <Segmented value={flow.currency} label={t.common.currency} options={[['CNY', t.common.cny], ['USD', t.common.usd]]} onChange={(currency: Currency) => onChange({ currency })} />
          </div>
          {isIncome && flow.frequency !== 'once' && (
            <label className="flex items-center justify-between gap-3">
              <span className="flex items-center text-muted-foreground">
                {t.flows.continuesLabel}
                <InfoTip label={t.flows.continuesLabel}>{t.flows.continuesTip}</InfoTip>
              </span>
              <Switch checked={!!flow.continues} onCheckedChange={(checked) => onChange({ continues: checked })} />
            </label>
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

/** Income (现金流) or expense (月支出) lines, each with its own frequency, edited like the balance sheet. */
export function FlowSheet({ kind, draft, previous, onDraft }: { kind: FlowKind; draft: Snapshot; previous?: Snapshot; onDraft: (patch: Partial<Snapshot>) => void }) {
  const [adding, setAdding] = useState<false | 'pick' | 'custom'>(false)
  const [customName, setCustomName] = useState('')
  const { t } = useI18n()
  const copy = t.flows[kind]
  const HeadIcon = kind === 'income' ? HandCoins : Receipt
  const categories = FLOW_CATEGORIES.filter((entry) => entry.kind === kind)
  const flows = draft.flows ?? []
  const mine = flows.filter((flow) => categories.some((entry) => entry.id === flow.category))
  const perMonth = mine.reduce((sum, flow) => sum + monthlyEquivalent(flow, draft.baseCurrency, draft.usdCny), 0)
  const previousById = new Map(previous?.flows?.map((flow) => [flow.id, flow]))
  const genericId = categories.find((entry) => entry.generic)!.id

  const update = (id: string, patch: Partial<FlowItem>) => onDraft({ flows: flows.map((flow) => (flow.id === id ? { ...flow, ...patch } : flow)) })

  const add = (category: string, name?: string) => {
    const flow = newFlow(category, draft.baseCurrency, name ?? t.flowCategories[category])
    onDraft({ flows: [...flows, flow] })
    setAdding(false)
    setCustomName('')
    requestAnimationFrame(() => document.getElementById(`flow-${flow.id}`)?.focus())
  }

  return (
    <section aria-labelledby={`flow-${kind}`} className="glass glass-flow rounded-[1.375rem] py-2">
      <header className="flex items-center justify-between gap-3 px-4 pt-2 pb-1">
        <h2 id={`flow-${kind}`} className="flex items-center gap-2 text-[17px] font-bold">
          <HeadIcon className="size-4.5 text-flow" aria-hidden="true" />
          {copy.title}
          <InfoTip label={copy.title}>{copy.tip}</InfoTip>
        </h2>
        <span className="text-[15px] font-bold whitespace-nowrap text-flow tabular-nums">{t.common.perMonth(money(perMonth, draft.baseCurrency))}</span>
      </header>
      <ul className="divide-y divide-border/70">
        {mine.map((flow) => (
          <FlowRow
            key={flow.id}
            flow={flow}
            last={previousById.get(flow.id)}
            draft={draft}
            onChange={(patch) => update(flow.id, patch)}
            onRemove={() => onDraft({ flows: flows.filter((entry) => entry.id !== flow.id) })}
          />
        ))}
      </ul>
      <div className="px-2 pt-1">
        {adding === 'pick' && (
          <div className="flex flex-wrap gap-2 px-2 py-2">
            {categories
              .filter((entry) => !entry.generic)
              .map((category) => (
                <button key={category.id} type="button" className="glass-capsule h-9 rounded-full px-3.5 text-sm font-semibold transition-colors hover:bg-action hover:text-action-foreground" onClick={() => add(category.id)}>
                  {t.flowCategories[category.id] ?? category.label}
                </button>
              ))}
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-sm font-semibold transition-colors hover:border-flow hover:text-flow"
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
              aria-label={copy.customName}
              placeholder={copy.customPlaceholder}
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
          <button type="button" className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-[15px] font-semibold text-flow transition-colors hover:bg-flow-soft" onClick={() => setAdding('pick')}>
            <Plus className="size-4.5" />
            {copy.add}
          </button>
        )}
      </div>
    </section>
  )
}
