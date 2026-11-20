import { describe, expect, it } from 'vitest'
import {
  followSelection,
  lineDomId,
  treeKeyAction,
  type TreeLine,
} from './treeKeys.ts'

// The Shop example, all unfolded:
//   0 ShopGui           level 1, open
//   1   CoinCounter     level 2, nothing inside
//   2   Window          level 2, open
//   3     UICorner      level 3 (a modifier line)
//   4     BuyButton     level 3, folded
//   5   Footer          level 2, open but its children are filtered out
const lines: TreeLine[] = [
  { level: 1, expanded: true },
  { level: 2, expanded: null },
  { level: 2, expanded: true },
  { level: 3, expanded: null },
  { level: 3, expanded: false },
  { level: 2, expanded: true },
]

describe('treeKeyAction', () => {
  it('moves up and down, stopping at the ends', () => {
    expect(treeKeyAction(lines, 1, 'ArrowDown')).toEqual({
      kind: 'focus',
      index: 2,
    })
    expect(treeKeyAction(lines, 1, 'ArrowUp')).toEqual({
      kind: 'focus',
      index: 0,
    })
    expect(treeKeyAction(lines, 5, 'ArrowDown')).toEqual({
      kind: 'focus',
      index: 5,
    })
    expect(treeKeyAction(lines, 0, 'ArrowUp')).toEqual({
      kind: 'focus',
      index: 0,
    })
  })

  it('jumps to the first and last lines', () => {
    expect(treeKeyAction(lines, 3, 'Home')).toEqual({ kind: 'focus', index: 0 })
    expect(treeKeyAction(lines, 3, 'End')).toEqual({ kind: 'focus', index: 5 })
  })

  it('Right unfolds a folded line, then steps into an open one', () => {
    expect(treeKeyAction(lines, 4, 'ArrowRight')).toEqual({
      kind: 'expand',
      index: 4,
    })
    expect(treeKeyAction(lines, 2, 'ArrowRight')).toEqual({
      kind: 'focus',
      index: 3,
    })
  })

  it('Right does nothing on a line with nothing (showing) inside', () => {
    expect(treeKeyAction(lines, 1, 'ArrowRight')).toEqual({ kind: 'none' })
    // Open, but the next line is a sibling, not a child.
    expect(treeKeyAction(lines, 5, 'ArrowRight')).toEqual({ kind: 'none' })
  })

  it('Left folds an open line, else goes to its parent', () => {
    expect(treeKeyAction(lines, 2, 'ArrowLeft')).toEqual({
      kind: 'collapse',
      index: 2,
    })
    expect(treeKeyAction(lines, 4, 'ArrowLeft')).toEqual({
      kind: 'focus',
      index: 2,
    })
    expect(treeKeyAction(lines, 3, 'ArrowLeft')).toEqual({
      kind: 'focus',
      index: 2,
    })
    expect(treeKeyAction(lines, 1, 'ArrowLeft')).toEqual({
      kind: 'focus',
      index: 0,
    })
  })

  it('Left on a folded top line has nowhere to go', () => {
    const folded: TreeLine[] = [{ level: 1, expanded: false }]
    expect(treeKeyAction(folded, 0, 'ArrowLeft')).toEqual({ kind: 'none' })
  })

  it('Space selects; the menu key and Shift+F10 open the menu', () => {
    expect(treeKeyAction(lines, 2, ' ')).toEqual({ kind: 'select', index: 2 })
    expect(treeKeyAction(lines, 2, 'ContextMenu')).toEqual({
      kind: 'menu',
      index: 2,
    })
    expect(treeKeyAction(lines, 2, 'F10', true)).toEqual({
      kind: 'menu',
      index: 2,
    })
  })

  it('leaves other keys to the editor’s shortcuts', () => {
    expect(treeKeyAction(lines, 2, 'Delete')).toBeNull()
    expect(treeKeyAction(lines, 2, 'F2')).toBeNull()
    expect(treeKeyAction(lines, 2, 'Enter')).toBeNull()
    expect(treeKeyAction(lines, 2, 'F10')).toBeNull() // without Shift
  })

  it('starts at the top when the current line isn’t showing', () => {
    expect(treeKeyAction(lines, -1, 'ArrowUp')).toEqual({
      kind: 'focus',
      index: 0,
    })
  })

  it('keeps arrows from the canvas even with no lines showing', () => {
    expect(treeKeyAction([], -1, 'ArrowDown')).toEqual({ kind: 'none' })
  })
})

describe('followSelection', () => {
  const root = 'root'

  it('keeps the last line while it agrees with the selection', () => {
    expect(followSelection({ id: 'a' }, ['b', 'a'], root)).toEqual({
      id: 'a',
    })
    // A modifier line, while its element is selected.
    expect(
      followSelection({ id: 'a', modifier: 'UICorner' }, ['a'], root),
    ).toEqual({ id: 'a', modifier: 'UICorner' })
    // The ScreenGui, while nothing is selected.
    expect(followSelection({ id: root }, [], root)).toEqual({ id: root })
  })

  it('follows the selection once it changes elsewhere', () => {
    // Clicked "c" on the canvas.
    expect(followSelection({ id: 'a' }, ['c'], root)).toEqual({ id: 'c' })
    expect(followSelection({ id: root }, ['c'], root)).toEqual({ id: 'c' })
    // Deselected everything.
    expect(followSelection({ id: 'a' }, [], root)).toEqual({ id: root })
  })

  it('starts at the last selected element, or the ScreenGui', () => {
    expect(followSelection(null, ['a', 'b'], root)).toEqual({ id: 'b' })
    expect(followSelection(null, [], root)).toEqual({ id: root })
  })
})

describe('lineDomId', () => {
  it('makes a page id with no spaces, even from an odd node id', () => {
    expect(lineDomId({ id: 'my frame' })).toBe('explorer-line-my%20frame')
    expect(lineDomId({ id: 'a', modifier: 'UIStroke' })).toBe(
      'explorer-line-a-UIStroke',
    )
  })
})
