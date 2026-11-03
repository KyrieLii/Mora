/** Third-party source for the on-demand rate refresh. Only called when the user taps refresh. */
export const FX_SOURCE_HOST = 'api.frankfurter.dev'
const FX_URL = `https://${FX_SOURCE_HOST}/v1/latest?base=USD&symbols=CNY`

export interface FxRate {
  usdCny: number
  date: string
}

/** Validates a Frankfurter response: a positive CNY rate and a YYYY-MM-DD date. */
export function parseFxResponse(data: unknown): FxRate | null {
  const value = data as { date?: unknown; rates?: { CNY?: unknown } } | null
  const usdCny = value?.rates?.CNY
  const date = value?.date
  if (typeof usdCny !== 'number' || !(usdCny > 0) || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return { usdCny, date }
}

/** Fetches the latest ECB reference rate. Sends no cookies or referrer and nothing from the sheet. */
export async function fetchLatestRate(timeoutMs = 8000): Promise<FxRate> {
  const response = await fetch(FX_URL, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(timeoutMs) })
  if (!response.ok) throw new Error(`Rate request failed: ${response.status}`)
  const rate = parseFxResponse(await response.json())
  if (!rate) throw new Error('Unexpected rate response')
  return rate
}
