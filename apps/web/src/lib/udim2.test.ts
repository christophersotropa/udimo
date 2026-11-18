import { describe, expect, it } from 'vitest'
import { boxCss, udimToCss } from './udim2.ts'

describe('udimToCss', () => {
  it('uses a plain percentage when there is no offset', () => {
    expect(udimToCss(0.5, 0)).toBe('50%')
    expect(udimToCss(0, 0)).toBe('0%')
  })

  it('uses plain pixels when there is no scale', () => {
    expect(udimToCss(0, 200)).toBe('200px')
  })

  it('adds scale and offset with calc()', () => {
    expect(udimToCss(1, -16)).toBe('calc(100% - 16px)')
    expect(udimToCss(0.25, 10)).toBe('calc(25% + 10px)')
  })
})

describe('boxCss', () => {
  it('centers an element with AnchorPoint (0.5, 0.5) at Position (0.5, 0.5)', () => {
    const css = boxCss(
      { xs: 0.4, xo: 0, ys: 0, yo: 300 },
      { xs: 0.5, xo: 0, ys: 0.5, yo: 0 },
      { x: 0.5, y: 0.5 },
    )
    expect(css).toEqual({
      left: '50%',
      top: '50%',
      width: '40%',
      height: '300px',
      transform: 'translate(-50%, -50%)',
    })
  })

  it('does not shift an element with the default AnchorPoint (0, 0)', () => {
    const css = boxCss(
      { xs: 0, xo: 100, ys: 0, yo: 100 },
      { xs: 0, xo: 24, ys: 0, yo: 24 },
      { x: 0, y: 0 },
    )
    expect(css.transform).toBe('translate(0%, 0%)')
  })
})
