import { describe, expect, it } from 'vitest'
import { parseFxResponse } from './fx'

describe('parseFxResponse', () => {
  it('reads the CNY rate and its date', () => {
    expect(parseFxResponse({ amount: 1, base: 'USD', date: '2026-11-02', rates: { CNY: 6.6483 } })).toEqual({ usdCny: 6.6483, date: '2026-11-02' })
  })

  it('rejects missing, zero or malformed values', () => {
    expect(parseFxResponse(null)).toBeNull()
    expect(parseFxResponse({ date: '2026-11-02', rates: {} })).toBeNull()
    expect(parseFxResponse({ date: '2026-11-02', rates: { CNY: 0 } })).toBeNull()
    expect(parseFxResponse({ date: 'yesterday', rates: { CNY: 6.6 } })).toBeNull()
  })
})
