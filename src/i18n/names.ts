import { en } from './en'
import { zh, type Messages } from './zh'

/**
 * Items keep whatever name was stored. When that name is still a category's default label (in either
 * language) or belongs to the sample household, show it in the current language instead.
 */
export function displayName(t: Messages, item: { id: string; name: string; category: string }, labels: 'categories' | 'flowCategories') {
  if (t.sampleNames[item.id]) return t.sampleNames[item.id]!
  const defaults = [zh[labels][item.category], en[labels][item.category]]
  return defaults.includes(item.name) ? (t[labels][item.category] ?? item.name) : item.name
}
