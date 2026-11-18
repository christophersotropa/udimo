import { describe, expect, it } from 'vitest'
import { clamp, formatNumber, parseNumberInput } from './numbers.ts'

describe('parseNumberInput', () => {
  it('reads numbers, ignoring spaces around them', () => {
    expect(parseNumberInput('0.5')).toBe(0.5)
    expect(parseNumberInput(' -24 ')).toBe(-24)
  })

  it('returns null for text that is not a number', () => {
    expect(parseNumberInput('')).toBeNull()
    expect(parseNumberInput('   ')).toBeNull()
    expect(parseNumberInput('-')).toBeNull()
    expect(parseNumberInput('abc')).toBeNull()
  })
})

describe('formatNumber', () => {
  it('hides floating-point noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
  })

  it('keeps up to 3 decimal places', () => {
    expect(formatNumber(0.12345)).toBe('0.123')
    expect(formatNumber(200)).toBe('200')
  })
})

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(1.5, 0, 1)).toBe(1)
    expect(clamp(-1, 0, 1)).toBe(0)
    expect(clamp(0.4, 0, 1)).toBe(0.4)
  })
})
