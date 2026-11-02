import type { FlowItem, Item, Snapshot } from '@/engine'
import { newFlow, newItem } from '@/lib/store'
import type { ImportLine, Proposal } from './types'

const normalise = (text: string) => text.toLowerCase().replace(/[\s\-·•_()（）]/g, '')

/** True when one name contains the other once spacing and punctuation are ignored, e.g. "余额宝" and "支付宝 余额宝". */
function similar(a: string, b: string) {
  const x = normalise(a)
  const y = normalise(b)
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x))
}

function findTarget<T extends { id: string; category: string; name: string; currency: string }>(line: ImportLine, pool: T[], taken: Set<string>) {
  const candidates = pool.filter((entry) => !taken.has(entry.id) && entry.category === line.category && entry.currency === line.currency)
  return candidates.find((entry) => similar(entry.name, line.name)) ?? null
}

/**
 * Pairs each recognised line with an existing item of the same category, currency and a similar name,
 * proposing an amount update; otherwise it proposes a new item. Each existing item is matched at most once.
 */
export function proposeChanges(draft: Snapshot, lines: ImportLine[]): Proposal[] {
  const taken = new Set<string>()
  return lines.map((line, index) => {
    const isFlow = line.kind === 'income' || line.kind === 'expense'
    const target = isFlow ? findTarget(line, draft.flows ?? [], taken) : findTarget(line, draft.items, taken)
    if (target) taken.add(target.id)
    return {
      key: `line-${index}`,
      line,
      action: target ? { type: 'update', targetId: target.id, previous: target.amount } : { type: 'add' },
      selected: true,
    }
  })
}

/** Applies the selected proposals and returns the changed lists; nothing unselected is touched. */
export function applyProposals(draft: Snapshot, proposals: Proposal[]): Pick<Snapshot, 'items' | 'flows'> {
  let items: Item[] = draft.items
  let flows: FlowItem[] = draft.flows ?? []
  for (const { line, action, selected } of proposals) {
    if (!selected) continue
    const isFlow = line.kind === 'income' || line.kind === 'expense'
    if (isFlow) {
      flows =
        action.type === 'update'
          ? flows.map((flow) => (flow.id === action.targetId ? { ...flow, amount: line.amount, frequency: line.frequency } : flow))
          : [...flows, { ...newFlow(line.category, line.currency, line.name || undefined), amount: line.amount, frequency: line.frequency }]
      continue
    }
    const patch: Partial<Item> = { amount: line.amount, ...(line.monthlyPayment ? { monthlyPayment: line.monthlyPayment } : {}) }
    items =
      action.type === 'update'
        ? items.map((item) => (item.id === action.targetId ? { ...item, ...patch } : item))
        : [...items, { ...newItem(line.category, line.currency, line.name || undefined), ...patch }]
  }
  return { items, flows }
}
