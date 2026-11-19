import { describe, expect, it } from 'vitest'
import { MODIFIER_DEFAULTS } from '../model/modifiers.ts'
import { gradientCss } from './gradient.ts'

const white = { r: 1, g: 1, b: 1 }
const blackToWhite = {
  ...MODIFIER_DEFAULTS.UIGradient,
  Color: [
    { time: 0, color: { r: 0, g: 0, b: 0 } },
    { time: 1, color: white },
  ],
}

describe('gradientCss', () => {
  it('runs left to right at Rotation 0, and turns clockwise', () => {
    expect(gradientCss(white, 0, blackToWhite)).toBe(
      'linear-gradient(90deg, rgb(0 0 0 / 1) 0%, rgb(255 255 255 / 1) 100%)',
    )
    expect(gradientCss(white, 0, { ...blackToWhite, Rotation: 90 })).toMatch(
      /^linear-gradient\(180deg/,
    ) // top to bottom
  })

  it('multiplies the background color and opacity', () => {
    const red = { r: 1, g: 0, b: 0 }
    const fading = {
      ...MODIFIER_DEFAULTS.UIGradient,
      Transparency: [
        { time: 0, value: 0 },
        { time: 1, value: 1 },
      ],
    }
    // A half-transparent red background, fading out to nothing.
    expect(gradientCss(red, 0.5, fading)).toBe(
      'linear-gradient(90deg, rgb(255 0 0 / 0.5) 0%, rgb(255 0 0 / 0) 100%)',
    )
  })

  it('makes a stop at every color and transparency keypoint', () => {
    const css = gradientCss(white, 0, {
      ...blackToWhite,
      Transparency: [
        { time: 0, value: 0 },
        { time: 0.5, value: 1 },
        { time: 1, value: 0 },
      ],
    })
    expect(css).toContain('rgb(128 128 128 / 0) 50%') // grey, see-through
  })
})
