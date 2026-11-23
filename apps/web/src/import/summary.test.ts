import { describe, expect, it } from 'vitest'
import { skippedLine, summarize } from './summary.ts'
import { importRbxmx } from './toDocument.ts'

const item = (className: string, name: string, children = '') =>
  `<Item class="${className}"><Properties><string name="Name">${name}</string></Properties>${children}</Item>`
const file = (...items: string[]) =>
  `<roblox version="4">${items.join('')}</roblox>`

describe('summarize', () => {
  it('describes a ScreenGui that opened as the design', () => {
    const result = importRbxmx(
      file(item('ScreenGui', 'Shop', item('Frame', 'Window'))),
    )
    expect(summarize(result)).toEqual({
      title: 'Opened Shop',
      summary: '2 instances came in.',
      skipped: [],
      notes: [],
    })
  })

  it('counts what was left out, including what was inside it', () => {
    const result = importRbxmx(
      file(
        item(
          'ScreenGui',
          'Shop',
          item(
            'Frame',
            'Window',
            item('LocalScript', 'Handler', item('ModuleScript', 'Util')),
          ),
        ),
      ),
    )
    const summary = summarize(result)
    expect(summary.summary).toBe('2 instances came in. 2 were left out.')
    expect(summary.skipped).toEqual([
      'LocalScript “Handler” in Shop.Window, and 1 inside it',
    ])
  })

  it('names elements added to the current design', () => {
    const result = importRbxmx(file(item('Frame', 'Card')))
    expect(summarize(result, ['Card']).title).toBe('Added Card')
    expect(summarize(result, ['Card']).summary).toBe('1 instance came in.')
    expect(summarize(result, ['Card', 'Buy']).title).toBe('Added Card and Buy')
    expect(summarize(result, ['A', 'B', 'C', 'D']).title).toBe(
      'Added A, B and 2 more',
    )
  })
})

describe('skippedLine', () => {
  it('leaves out the path and count when there are none', () => {
    expect(
      skippedLine({ className: 'Folder', name: 'Stuff', path: '', inside: 0 }),
    ).toBe('Folder “Stuff”')
  })
})
