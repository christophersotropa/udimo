import { describe, expect, it } from 'vitest'
import { CATALOG, searchCatalog } from './catalog.ts'
import { MODIFIER_CLASSES } from './modifiers.ts'

const names = (entries: { className: string }[]) =>
  entries.map((e) => e.className)

describe('the insert catalog', () => {
  it('offers every element class and every modifier', () => {
    const elements = CATALOG.filter((e) => e.kind === 'element')
    expect(elements).toHaveLength(7)
    expect(names(CATALOG.filter((e) => e.kind === 'modifier')).sort()).toEqual(
      [...MODIFIER_CLASSES].sort(),
    )
  })

  it('searches any part of the name, ignoring capitals', () => {
    expect(names(searchCatalog('corner'))).toEqual(['UICorner'])
    expect(names(searchCatalog(' IMAGE '))).toEqual([
      'ImageLabel',
      'ImageButton',
    ])
    expect(searchCatalog('')).toHaveLength(CATALOG.length)
    expect(searchCatalog('nothing like this')).toEqual([])
  })

  it('can leave modifiers out (the ScreenGui has none)', () => {
    expect(searchCatalog('', false).every((e) => e.kind === 'element')).toBe(
      true,
    )
  })
})
