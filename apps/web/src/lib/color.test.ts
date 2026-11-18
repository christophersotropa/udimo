import { describe, expect, it } from 'vitest'
import {
  color3FromRgb,
  color3ToCss,
  color3ToHex,
  hexToColor3,
} from './color.ts'

describe('hex colors', () => {
  it('writes a Color3 as #rrggbb', () => {
    expect(color3ToHex({ r: 1, g: 0.5, b: 0 })).toBe('#ff8000')
    expect(color3ToHex({ r: 0, g: 0, b: 0 })).toBe('#000000')
  })

  it('reads #rrggbb back into a Color3', () => {
    expect(hexToColor3('#ff0033')).toEqual({ r: 1, g: 0, b: 0.2 })
  })

  it('survives a round trip', () => {
    expect(color3ToHex(hexToColor3('#3cbe64'))).toBe('#3cbe64')
  })
})

describe('color3FromRgb', () => {
  it('turns 0 to 255 numbers into 0 to 1', () => {
    expect(color3FromRgb(255, 0, 51)).toEqual({ r: 1, g: 0, b: 0.2 })
  })
})

describe('color3ToCss', () => {
  it('writes a solid color by default', () => {
    expect(color3ToCss({ r: 1, g: 0.5, b: 0 })).toBe('rgb(255 128 0 / 1)')
  })

  it('turns Roblox transparency into CSS alpha', () => {
    expect(color3ToCss({ r: 0, g: 0, b: 0 }, 0.25)).toBe('rgb(0 0 0 / 0.75)')
    expect(color3ToCss({ r: 0, g: 0, b: 0 }, 1)).toBe('rgb(0 0 0 / 0)')
  })
})
