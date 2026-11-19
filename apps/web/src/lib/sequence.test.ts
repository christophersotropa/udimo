import { describe, expect, it } from 'vitest'
import { colorAt, isValidTimeline, numberAt, withEnd } from './sequence.ts'

const black = { r: 0, g: 0, b: 0 }
const white = { r: 1, g: 1, b: 1 }

describe('colorAt and numberAt', () => {
  it('blend in a straight line between keypoints', () => {
    const colors = [
      { time: 0, color: black },
      { time: 1, color: white },
    ]
    expect(colorAt(colors, 0.25)).toEqual({ r: 0.25, g: 0.25, b: 0.25 })

    const numbers = [
      { time: 0, value: 0 },
      { time: 0.5, value: 1 },
      { time: 1, value: 0 },
    ]
    expect(numberAt(numbers, 0.25)).toBe(0.5)
    expect(numberAt(numbers, 0.75)).toBe(0.5)
    expect(numberAt(numbers, 1)).toBe(0)
  })
})

describe('withEnd', () => {
  it('changes only the first or last keypoint', () => {
    const numbers = [
      { time: 0, value: 0 },
      { time: 0.5, value: 0.5 },
      { time: 1, value: 0 },
    ]
    expect(withEnd(numbers, 'end', { value: 1 })).toEqual([
      { time: 0, value: 0 },
      { time: 0.5, value: 0.5 },
      { time: 1, value: 1 },
    ])
    expect(numbers[2].value).toBe(0) // the original is untouched
  })
})

describe('isValidTimeline', () => {
  it("follows Roblox's rules for sequences", () => {
    expect(isValidTimeline([{ time: 0 }, { time: 1 }])).toBe(true)
    expect(isValidTimeline([{ time: 0 }])).toBe(false) // too few
    expect(isValidTimeline([{ time: 0.1 }, { time: 1 }])).toBe(false)
    expect(isValidTimeline([{ time: 0 }, { time: 0.9 }])).toBe(false)
    expect(
      isValidTimeline([{ time: 0 }, { time: 0.6 }, { time: 0.4 }, { time: 1 }]),
    ).toBe(false)
  })
})
