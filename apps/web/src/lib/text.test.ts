import { describe, expect, it } from 'vitest'
import { MAX_TEXT_SIZE, scaledTextSize } from './text.ts'

describe('scaledTextSize', () => {
  it('fills the height when the text is short', () => {
    // 2 units wide per pixel: at size 40 it's 80px wide, fits in 300.
    expect(scaledTextSize(2, 1, { width: 300, height: 40 })).toBe(40)
  })

  it('shrinks to fit the width when the text is long', () => {
    // 10 per pixel in 300px wide: at most size 30.
    expect(scaledTextSize(10, 1, { width: 300, height: 80 })).toBe(30)
  })

  it('shares the height between lines', () => {
    expect(scaledTextSize(1, 3, { width: 1000, height: 90 })).toBe(30)
  })

  it('fits whole lines, letting the font keep room above and below', () => {
    // Like the Pet Inventory's names in Studio: a 24px-tall box and a font
    // whose lines are 1.26 times the text size gives size 19.
    expect(scaledTextSize(1, 1, { width: 1000, height: 24 }, 1.26)).toBe(19)
  })

  it('never goes over 100, or under 1', () => {
    expect(scaledTextSize(1, 1, { width: 5000, height: 5000 })).toBe(
      MAX_TEXT_SIZE,
    )
    expect(scaledTextSize(50, 1, { width: 10, height: 10 })).toBe(1)
  })
})
