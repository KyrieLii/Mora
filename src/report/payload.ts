import type { Snapshot } from '@/engine'
import type { Locale } from '@/i18n'

/** What the CLI embeds in the standalone report page. */
export interface ReportPayload {
  format: 'family-finance-review/report@1'
  /** A preview shows a review that has not been saved yet. */
  mode: 'preview' | 'saved'
  locale?: Locale
  /** Every review up to and including the one shown, oldest first, so month-on-month and year-on-year work. */
  snapshots: Snapshot[]
}

export const DATA_PLACEHOLDER = '__FFR_DATA__'

/** Serialises the payload for a `<script type="application/json">` block; escaping `<` keeps `</script>` in a name harmless. */
export const embedPayload = (payload: ReportPayload) => JSON.stringify(payload).replace(/</g, '\\u003c')
