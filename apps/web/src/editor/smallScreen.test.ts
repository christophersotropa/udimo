import { describe, expect, it } from 'vitest'
import {
  MIN_EDITOR_HEIGHT,
  MIN_EDITOR_WIDTH,
  tooSmallForEditor,
} from './smallScreen.ts'

describe('tooSmallForEditor', () => {
  it('fits laptops and desktops', () => {
    expect(tooSmallForEditor({ width: 1280, height: 800 })).toBe(false)
    expect(tooSmallForEditor({ width: 1920, height: 1080 })).toBe(false)
  })

  it('fits exactly at the minimum', () => {
    expect(
      tooSmallForEditor({ width: MIN_EDITOR_WIDTH, height: MIN_EDITOR_HEIGHT }),
    ).toBe(false)
  })

  it('is too small for a phone, upright or on its side', () => {
    expect(tooSmallForEditor({ width: 390, height: 844 })).toBe(true)
    expect(tooSmallForEditor({ width: 844, height: 390 })).toBe(true)
  })

  it('is too small one pixel under either minimum', () => {
    expect(
      tooSmallForEditor({ width: MIN_EDITOR_WIDTH - 1, height: 900 }),
    ).toBe(true)
    expect(
      tooSmallForEditor({ width: 1200, height: MIN_EDITOR_HEIGHT - 1 }),
    ).toBe(true)
  })

  it('fits a tablet held upright', () => {
    expect(tooSmallForEditor({ width: 820, height: 1180 })).toBe(false)
  })
})
