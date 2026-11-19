import { describe, expect, it } from 'vitest'
import {
  closestWeight,
  FONT_IDS,
  FONTS,
  fontCss,
  resolveFontFace,
} from './fonts.ts'
import { FONT_WEIGHT } from './enums.ts'

describe('the font table', () => {
  it('lists every font’s weights lightest first, each with Regular', () => {
    for (const id of FONT_IDS) {
      const numbers = FONTS[id].weights.map((w) => FONT_WEIGHT[w])
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
      expect(FONTS[id].weights).toContain('Regular')
    }
  })

  it('matches Studio’s Weight lists', () => {
    expect(FONTS.Roboto.weights).toEqual([
      'Thin',
      'Light',
      'Regular',
      'Medium',
      'Bold',
      'Heavy',
    ])
    expect(FONTS.FredokaOne.weights).toEqual(['Regular'])
  })
})

describe('closestWeight', () => {
  it('keeps a weight the font has', () => {
    expect(closestWeight('Roboto', 'Medium')).toBe('Medium')
  })

  it('uses the nearest weight the font has', () => {
    expect(closestWeight('Roboto', 'ExtraBold')).toBe('Heavy') // tie: 700 or 900
    expect(closestWeight('Roboto', 'SemiBold')).toBe('Bold') // tie: 500 or 700
    expect(closestWeight('Arial', 'Thin')).toBe('Regular')
    expect(closestWeight('SourceSansPro', 'Medium')).toBe('Regular') // tie: 400 or 600
    expect(closestWeight('LuckiestGuy', 'Heavy')).toBe('Regular')
  })
})

describe('resolveFontFace and fontCss', () => {
  it('fills in Normal for a face saved before italic existed', () => {
    expect(resolveFontFace({ family: 'Roboto', weight: 'Bold' })).toEqual({
      family: 'Roboto',
      weight: 'Bold',
      style: 'Normal',
    })
  })

  it('writes CSS font text with the weight really drawn', () => {
    expect(
      fontCss({ family: 'Arial', weight: 'Thin', style: 'Italic' }, 24),
    ).toBe(`italic 400 24px ${FONTS.Arial.css}`)
    expect(fontCss({ family: 'Roboto', weight: 'Bold' }, 10)).toBe(
      `700 10px ${FONTS.Roboto.css}`,
    )
  })
})
