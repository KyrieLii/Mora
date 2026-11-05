import { useI18n } from '@/i18n'
import { displayName } from '@/i18n/names'
import { FLOW_CATEGORIES, monthlyEquivalent, type FlowItem, type FlowKind, type Frequency, type Snapshot } from '@/engine'
import { money, shortMoney, signed } from '@/lib/format'
import { newFlow } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  Building,
  Car,
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
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { AmountInput } from './AmountInput'
import { InfoTip } from './InfoTip'
import { ROW_CONTROL, RowActions } from './RowActions'

const ICONS: Record<string, LucideIcon> = {
  salary: Briefcase,
  familySalary: Briefcase,
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

const EXPENSE_FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'annual']
const INCOME_FREQUENCIES: Frequency[] = [...EXPENSE_FREQUENCIES, 'once']

function FlowRow({
  flow,
  last,
  draft,
  readOnly,
  onChange,
  onRemove,
}: {
  flow: FlowItem
  last?: FlowItem
  draft: Snapshot
  readOnly?: boolean
  onChange: (patch: Partial<FlowItem>) => void
  onRemove: () => void
}) {
  const { t } = useI18n()
  const def = FLOW_CATEGORIES.find((entry) => entry.id === flow.category)
  const label = t.flowCategories[flow.category] ?? def?.label ?? ''
  const name = displayName(t, flow, 'flowCategories')
  const Icon = ICONS[flow.category] ?? CircleDollarSign
  const isIncome = def?.kind !== 'expense'
  const frequencies = isIncome ? INCOME_FREQUENCIES : EXPENSE_FREQUENCIES
  const nextFrequency = frequencies[(frequencies.indexOf(flow.frequency) + 1) % frequencies.length]!
  const frequencyLabel = t.flows.switchFrequency(t.frequency[flow.frequency], t.frequency[nextFrequency])
  const perMonth = monthlyEquivalent(flow, draft.baseCurrency, draft.usdCny)
  const change = last && last.currency === flow.currency && last.amount !== flow.amount ? flow.amount - last.amount : null
  const note = [
    !def?.generic && label !== name && flow.frequency !== 'once' ? label : '',
    readOnly ? t.frequency[flow.frequency] : '',
    flow.frequency !== 'monthly' && flow.frequency !== 'once' && flow.amount ? t.common.approxPerMonth(shortMoney(perMonth, draft.baseCurrency)) : '',
  ].filter(Boolean)

  return (
    <li className="px-2">
      <div className={cn('flex items-start py-2', readOnly && 'gap-1')}>
        <span className={cn('ml-1.5 grid shrink-0 place-items-center rounded-[0.7rem] bg-flow-soft text-flow', readOnly ? 'mt-0.5 size-8' : 'mt-2 size-7 max-[359px]:hidden')} aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <div className={cn('grid min-w-0 flex-1', readOnly ? 'pt-0.5' : 'pt-1.5')}>
          <input
            aria-label={t.common.name}
            readOnly={readOnly}
            className="w-full min-w-0 rounded-lg bg-transparent px-2 py-1 text-[16px] font-medium text-ellipsis outline-none transition-colors hover:bg-muted/70 focus:bg-muted focus:ring-2 focus:ring-ring/40"
            value={name}
            onChange={(event) => onChange({ name: event.target.value })}
            onBlur={(event) => !event.target.value.trim() && onChange({ name: label })}
          />
          {/* Each separator rides at the end of the segment before it, so a wrapped line never starts with a dot. */}
          {note.length > 0 && <span className="flex flex-wrap gap-x-1 px-2 text-[13px] text-muted-foreground">
            {note.map((part, index) => (
              <span key={part} className="whitespace-nowrap">
                {part}
                {index < note.length - 1 && ' ·'}
              </span>
            ))}
          </span>}
        </div>
        <div className={cn('grid min-w-0 justify-items-end', !readOnly && 'pt-0.5')}>
          <AmountInput id={`flow-${flow.id}`} value={flow.amount} currency={flow.currency} label={`${name} ${t.sheet.amount}`} readOnly={readOnly} className={cn('text-flow', !readOnly && 'h-10 w-24 px-1.5 max-[359px]:w-20 sm:w-36')} onCommit={(amount) => onChange({ amount })} />
          {last && (
            <span className={cn('px-2 text-[13px] tabular-nums', change === null ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
              {change === null ? t.common.unchanged : t.common.vsLast(signed(change, (value) => shortMoney(value, flow.currency)))}
            </span>
          )}
        </div>
        {!readOnly && (
          <RowActions currency={flow.currency} onCurrencyChange={(currency) => onChange({ currency })} onRemove={onRemove}>
            <button
              type="button"
              className={cn(ROW_CONTROL, 'text-sm font-semibold')}
              aria-label={frequencyLabel}
              title={frequencyLabel}
              onClick={() => onChange({ frequency: nextFrequency })}
            >
              {t.flows.frequencyShort[flow.frequency]}
            </button>
          </RowActions>
        )}
      </div>

    </li>
  )
}

/** Income (现金流) or expense (月支出) lines, each with its own frequency, edited like the balance sheet. */
export function FlowSheet({ kind, draft, previous, readOnly, onDraft }: { kind: FlowKind; draft: Snapshot; previous?: Snapshot; readOnly?: boolean; onDraft: (patch: Partial<Snapshot>) => void }) {
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
            readOnly={readOnly}
            onChange={(patch) => update(flow.id, patch)}
            onRemove={() => onDraft({ flows: flows.filter((entry) => entry.id !== flow.id) })}
          />
        ))}
      </ul>
      {!readOnly && <div className="px-2 pt-1">
        {adding === 'pick' && (
          <div className="flex flex-wrap gap-2 px-2 py-2">
            {categories
              .filter((entry) => !entry.generic && !entry.legacy)
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
      </div>}
    </section>
  )
}
