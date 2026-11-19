import { describe, expect, it } from 'vitest'
import {
  arrangeGrid,
  arrangeList,
  type LayoutItem,
  sortForLayout,
} from './arrange.ts'
import { MODIFIER_DEFAULTS } from './modifiers.ts'

const AREA = { width: 300, height: 200 }

function item(
  id: string,
  width = 100,
  height = 40,
  layoutOrder = 0,
): LayoutItem {
  return { id, name: id, layoutOrder, width, height }
}

// Just the positions, as [id, x, y], to keep expectations short.
function positions(boxes: Map<string, { x: number; y: number }>) {
  return [...boxes].map(([id, box]) => [id, box.x, box.y])
}

describe('sortForLayout', () => {
  it('sorts by LayoutOrder, keeping tree order for ties', () => {
    const items = [item('a', 1, 1, 2), item('b', 1, 1, 0), item('c', 1, 1, 0)]
    expect(sortForLayout(items, 'LayoutOrder').map((i) => i.id)).toEqual([
      'b',
      'c',
      'a',
    ])
  })

  it('sorts by Name', () => {
    const items = [item('Shop'), item('Coins'), item('Gems')]
    expect(sortForLayout(items, 'Name').map((i) => i.id)).toEqual([
      'Coins',
      'Gems',
      'Shop',
    ])
  })
})

describe('arrangeList', () => {
  const list = MODIFIER_DEFAULTS.UIListLayout // Vertical, Left, Top

  it('stacks children from the top-left by default, keeping their sizes', () => {
    const boxes = arrangeList([item('a'), item('b', 50, 20)], AREA, list)
    expect(boxes.get('a')).toEqual({ x: 0, y: 0, width: 100, height: 40 })
    expect(boxes.get('b')).toEqual({ x: 0, y: 40, width: 50, height: 20 })
  })

  it('adds Padding between children (Scale is a fraction of the area)', () => {
    const boxes = arrangeList([item('a'), item('b')], AREA, {
      ...list,
      Padding: { s: 0.05, o: 0 }, // 5% of 200 = 10
    })
    expect(positions(boxes)).toEqual([
      ['a', 0, 0],
      ['b', 0, 50],
    ])
  })

  it('centers the run along its direction and each child across it', () => {
    const boxes = arrangeList([item('a'), item('b')], AREA, {
      ...list,
      HorizontalAlignment: 'Center',
      VerticalAlignment: 'Center',
    })
    // 80px of children in 200px: starts at 60. 100px wide in 300px: x = 100.
    expect(positions(boxes)).toEqual([
      ['a', 100, 60],
      ['b', 100, 100],
    ])
  })

  it('makes a row with FillDirection Horizontal', () => {
    const boxes = arrangeList([item('a'), item('b')], AREA, {
      ...list,
      FillDirection: 'Horizontal',
      HorizontalAlignment: 'Right',
    })
    expect(positions(boxes)).toEqual([
      ['a', 100, 0],
      ['b', 200, 0],
    ])
  })
})

describe('arrangeGrid', () => {
  const grid = MODIFIER_DEFAULTS.UIGridLayout // 100 × 100 cells, 5px gaps

  it('fills rows with as many cells as fit, then wraps', () => {
    // 300px fits two cells (205px), not three (310px).
    const boxes = arrangeGrid([item('a'), item('b'), item('c')], AREA, grid)
    expect(positions(boxes)).toEqual([
      ['a', 0, 0],
      ['b', 105, 0],
      ['c', 0, 105],
    ])
    expect(boxes.get('a')?.width).toBe(100) // every child takes the cell size
  })

  it('fits cells that fill the row exactly (no gap needed after the last)', () => {
    // 100 + 5 + 100 = 205: two cells fit a 205px row exactly.
    const boxes = arrangeGrid(
      [item('a'), item('b')],
      { width: 205, height: 200 },
      grid,
    )
    expect(positions(boxes)).toEqual([
      ['a', 0, 0],
      ['b', 105, 0],
    ])
  })

  it('respects FillDirectionMaxCells', () => {
    const boxes = arrangeGrid([item('a'), item('b')], AREA, {
      ...grid,
      FillDirectionMaxCells: 1,
    })
    expect(positions(boxes)).toEqual([
      ['a', 0, 0],
      ['b', 0, 105],
    ])
  })

  it('fills columns with FillDirection Vertical', () => {
    // Two cells stacked need 205px; the area is 200px tall, so each column
    // holds one, and the second child starts a new column.
    const boxes = arrangeGrid([item('a'), item('b')], AREA, {
      ...grid,
      FillDirection: 'Vertical',
    })
    expect(positions(boxes)).toEqual([
      ['a', 0, 0],
      ['b', 105, 0],
    ])
  })

  it('aligns the whole grid', () => {
    const boxes = arrangeGrid([item('a')], AREA, {
      ...grid,
      HorizontalAlignment: 'Center',
      VerticalAlignment: 'Bottom',
    })
    expect(positions(boxes)).toEqual([['a', 100, 100]])
  })
})
