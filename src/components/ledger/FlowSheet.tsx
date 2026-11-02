import { Switch } from '@/components/ui/switch'
import { FLOW_CATEGORIES, FREQUENCY_LABELS, monthlyEquivalent, type Currency, type FlowItem, type FlowKind, type Frequency, type Snapshot } from '@/engine'
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

const COPY: Record<FlowKind, { title: string; tip: string; add: string }> = {
  income: {
    title: '现金流',
    tip: '工资、奖金、补偿等收入。按实际发放频率填写，系统会折算成每月金额；一次性的收入不算进每月合计，只计入安全垫。',
    add: '添加收入',
  },
  expense: {
    title: '月支出',
    tip: '房租、车险、订阅等支出，按实际频率填写，系统会折算成每月金额。贷款月供已在负债里填写，这里不用重复。',
    add: '添加支出',
  },
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
  const def = FLOW_CATEGORIES.find((entry) => entry.id === flow.category)
  const Icon = ICONS[flow.category] ?? CircleDollarSign
  const isIncome = def?.kind !== 'expense'
  const perMonth = monthlyEquivalent(flow, draft.baseCurrency, draft.usdCny)
  const change = last && last.currency === flow.currency && last.amount !== flow.amount ? flow.amount - last.amount : null
  const note = [
    !def?.generic && def?.label !== flow.name && flow.frequency !== 'once' ? def?.label : '',
    FREQUENCY_LABELS[flow.frequency],
    flow.frequency !== 'monthly' && flow.frequency !== 'once' && flow.amount ? `约 ${shortMoney(perMonth, draft.baseCurrency)}/月` : '',
    isIncome && flow.continues && flow.frequency !== 'once' ? '持续' : '',
  ].filter(Boolean)

  return (
    <li className="px-2">
      <div className="flex items-start gap-1 py-2">
        <span className="mt-0.5 ml-1.5 grid size-8 shrink-0 place-items-center rounded-[0.7rem] bg-flow-soft text-flow" aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <div className="grid min-w-0 flex-1 pt-0.5">
          <input
            aria-label="名称"
            className="w-full min-w-0 rounded-lg bg-transparent px-2 py-1 text-[16px] font-medium text-ellipsis outline-none transition-colors hover:bg-muted/70 focus:bg-muted focus:ring-2 focus:ring-ring/40"
            value={flow.name}
            onChange={(event) => onChange({ name: event.target.value })}
            onBlur={(event) => !event.target.value.trim() && onChange({ name: def?.label ?? '' })}
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
          <AmountInput id={`flow-${flow.id}`} value={flow.amount} currency={flow.currency} label={`${flow.name}金额`} className="text-flow" onCommit={(amount) => onChange({ amount })} />
          {last && (
            <span className={cn('px-2 text-[13px] tabular-nums', change === null ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
              {change === null ? '未变' : `较上次 ${signed(change, (value) => shortMoney(value, flow.currency))}`}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? `收起${flow.name}的设置` : `展开${flow.name}的设置`}
          className="relative mt-0.5 -ml-1 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-1.5 hover:bg-muted hover:text-foreground"
          onClick={() => setOpen(!open)}
        >
          <ChevronDown className={cn('size-4.5 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="mx-2 mb-3 grid gap-3 rounded-[1rem] border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted-foreground">频率</span>
            <Segmented
              value={flow.frequency}
              label="频率"
              options={(isIncome ? ['monthly', 'quarterly', 'annual', 'once'] : ['monthly', 'quarterly', 'annual']).map((id) => [id as Frequency, FREQUENCY_LABELS[id as Frequency]])}
              onChange={(frequency: Frequency) => onChange({ frequency })}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted-foreground">币种</span>
            <Segmented value={flow.currency} label="币种" options={[['CNY', '人民币'], ['USD', '美元']]} onChange={(currency: Currency) => onChange({ currency })} />
          </div>
          {isIncome && flow.frequency !== 'once' && (
            <label className="flex items-center justify-between gap-3">
              <span className="flex items-center text-muted-foreground">
                主要收入中断后仍有
                <InfoTip label="中断后仍有">比如配偶的工资、租金。打开后，这笔收入标为“持续”，会继续计入安全垫的推算。</InfoTip>
              </span>
              <Switch checked={!!flow.continues} onCheckedChange={(checked) => onChange({ continues: checked })} />
            </label>
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

/** Income (现金流) or expense (月支出) lines, each with its own frequency, edited like the balance sheet. */
export function FlowSheet({ kind, draft, previous, onDraft }: { kind: FlowKind; draft: Snapshot; previous?: Snapshot; onDraft: (patch: Partial<Snapshot>) => void }) {
  const [adding, setAdding] = useState<false | 'pick' | 'custom'>(false)
  const [customName, setCustomName] = useState('')
  const copy = COPY[kind]
  const HeadIcon = kind === 'income' ? HandCoins : Receipt
  const categories = FLOW_CATEGORIES.filter((entry) => entry.kind === kind)
  const flows = draft.flows ?? []
  const mine = flows.filter((flow) => categories.some((entry) => entry.id === flow.category))
  const perMonth = mine.reduce((sum, flow) => sum + monthlyEquivalent(flow, draft.baseCurrency, draft.usdCny), 0)
  const previousById = new Map(previous?.flows?.map((flow) => [flow.id, flow]))
  const genericId = categories.find((entry) => entry.generic)!.id

  const update = (id: string, patch: Partial<FlowItem>) => onDraft({ flows: flows.map((flow) => (flow.id === id ? { ...flow, ...patch } : flow)) })

  const add = (category: string, name?: string) => {
    const flow = newFlow(category, draft.baseCurrency, name)
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
        <span className="text-[15px] font-bold whitespace-nowrap text-flow tabular-nums">{money(perMonth, draft.baseCurrency)}/月</span>
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
                  {category.label}
                </button>
              ))}
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-sm font-semibold transition-colors hover:border-flow hover:text-flow"
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
              aria-label={`自定义${kind === 'income' ? '收入' : '支出'}的名称`}
              placeholder={kind === 'income' ? '名称，比如 稿费' : '名称，比如 宠物开销'}
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
          <button type="button" className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-[15px] font-semibold text-flow transition-colors hover:bg-flow-soft" onClick={() => setAdding('pick')}>
            <Plus className="size-4.5" />
            {copy.add}
          </button>
        )}
      </div>
    </section>
  )
}
