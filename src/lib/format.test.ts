import { describe, expect, it } from 'vitest'
import { parseAmount } from './format'

describe('parseAmount', () => {
  it('reads Chinese and English shorthand', () => {
    expect(parseAmount('1.5万')).toBe(15000)
    expect(parseAmount('3w')).toBe(30000)
    expect(parseAmount('0.2亿')).toBe(20000000)
    expect(parseAmount('15k')).toBe(15000)
    expect(parseAmount('1.2M')).toBe(1200000)
    expect(parseAmount('¥1,500')).toBe(1500)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBeNull()
  })
})
