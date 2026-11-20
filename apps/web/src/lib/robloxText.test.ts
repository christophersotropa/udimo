import { describe, expect, it } from 'vitest'
import {
  formatColor3,
  formatUDim,
  formatUDim2,
  formatRect,
  formatVector2,
  parseRect,
  parseColor3,
  parseUDim,
  parseUDim2,
  parseVector2,
} from './robloxText.ts'

describe('UDim2 as text', () => {
  it('writes Studio’s format', () => {
    expect(formatUDim2({ xs: 0.34, xo: 0, ys: 0, yo: -24 })).toBe(
      '{0.34, 0}, {0, -24}',
    )
  })

  it('reads it back, and forgiving variations', () => {
    expect(parseUDim2('{0.34, 0}, {0, -24}')).toEqual({
      xs: 0.34,
      xo: 0,
      ys: 0,
      yo: -24,
    })
    expect(parseUDim2('0.5 0 .5 10.6')).toEqual({
      xs: 0.5,
      xo: 0,
      ys: 0.5,
      yo: 11,
    })
  })

  it('refuses the wrong number of numbers', () => {
    expect(parseUDim2('{0.5, 0}')).toBeNull()
    expect(parseUDim2('big')).toBeNull()
  })

  it('round-trips', () => {
    const value = { xs: 0.125, xo: 8, ys: 1, yo: -36 }
    expect(parseUDim2(formatUDim2(value))).toEqual(value)
  })
})

describe('UDim and Vector2 as text', () => {
  it('writes and reads them', () => {
    expect(formatUDim({ s: 0, o: 14 })).toBe('{0, 14}')
    expect(parseUDim('{0.5, 4}')).toEqual({ s: 0.5, o: 4 })
    expect(formatVector2({ x: 0.5, y: 1 })).toBe('0.5, 1')
    expect(parseVector2('0.5,1')).toEqual({ x: 0.5, y: 1 })
    expect(parseVector2('1')).toBeNull()
  })
})

describe('Rect as text', () => {
  it('writes and reads the four corner numbers', () => {
    const rect = { minX: 10, minY: 12, maxX: 54.5, maxY: 52 }
    expect(formatRect(rect)).toBe('10, 12, 54.5, 52')
    expect(parseRect('10, 12, 54.5, 52')).toEqual(rect)
    expect(parseRect('10 12 54.5 52')).toEqual(rect)
  })

  it('needs exactly four numbers', () => {
    expect(parseRect('1, 2, 3')).toBeNull()
    expect(parseRect('1, 2, 3, 4, 5')).toBeNull()
  })
})

describe('Color3 as text', () => {
  it('writes 0–255 numbers like Studio', () => {
    expect(formatColor3({ r: 42 / 255, g: 55 / 255, b: 87 / 255 })).toBe(
      '42, 55, 87',
    )
  })

  it('reads numbers (kept in range) or a hex code', () => {
    expect(parseColor3('255, 0, 0')).toEqual({ r: 1, g: 0, b: 0 })
    expect(parseColor3('300, -5, 0')).toEqual({ r: 1, g: 0, b: 0 })
    expect(parseColor3('#00ff00')).toEqual({ r: 0, g: 1, b: 0 })
    expect(parseColor3('1, 2')).toBeNull()
  })
})
