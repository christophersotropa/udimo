import { describe, expect, it } from 'vitest'
import {
  AUTO_SCROLL_MAX,
  AUTO_SCROLL_ZONE,
  autoScrollSpeed,
} from './autoScroll.ts'

// A list from y = 100 to y = 500.
const speed = (y: number) => autoScrollSpeed(y, 100, 500)

describe('autoScrollSpeed', () => {
  it('doesn’t scroll away from the edges', () => {
    expect(speed(300)).toBe(0)
    expect(speed(100 + AUTO_SCROLL_ZONE)).toBe(0)
  })

  it('scrolls up near the top, faster closer in', () => {
    expect(speed(116)).toBeCloseTo(-AUTO_SCROLL_MAX / 2)
    expect(speed(100)).toBe(-AUTO_SCROLL_MAX)
  })

  it('scrolls down near the bottom', () => {
    expect(speed(484)).toBeCloseTo(AUTO_SCROLL_MAX / 2)
  })

  it('goes no faster than full speed past an edge', () => {
    expect(speed(40)).toBe(-AUTO_SCROLL_MAX)
    expect(speed(600)).toBe(AUTO_SCROLL_MAX)
  })
})
