import { describe, expect, it } from 'vitest'
import {
  arrangeGrid,
  arrangeList,
  arrangePages,
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

describe('arrangePages', () => {
  const pages = MODIFIER_DEFAULTS.UIPageLayout // Horizontal, top-left
  // Three full-size pages, like most page layouts.
  const three = () => [
    item('a', 300, 200),
    item('b', 300, 200),
    item('c', 300, 200),
  ]

  it('shows the first page in place, the others in a row after it', () => {
    expect(positions(arrangePages(three(), AREA, pages))).toEqual([
      ['a', 0, 0],
      ['b', 300, 0],
      ['c', 600, 0],
    ])
  })

  it('puts the shown page in place, with the others either side', () => {
    const gap = { ...pages, Padding: { s: 0, o: 10 } }
    expect(positions(arrangePages(three(), AREA, gap, 'b'))).toEqual([
      ['a', -310, 0],
      ['b', 0, 0],
      ['c', 310, 0],
    ])
  })

  it('shows the first page when the shown one isn’t a page', () => {
    const boxes = arrangePages(three(), AREA, pages, 'gone')
    expect(boxes.get('a')).toMatchObject({ x: 0, y: 0 })
  })

  it('stacks pages in a column when Vertical, Padding a fraction of the height', () => {
    const column = {
      ...pages,
      FillDirection: 'Vertical' as const,
      Padding: { s: 0.1, o: 0 }, // 20 px of 200
    }
    expect(positions(arrangePages(three(), AREA, column, 'c'))).toEqual([
      ['a', 0, -440],
      ['b', 0, -220],
      ['c', 0, 0],
    ])
  })

  it('aligns smaller pages, each keeping its own size', () => {
    const centred = {
      ...pages,
      HorizontalAlignment: 'Center' as const,
      VerticalAlignment: 'Center' as const,
    }
    const small = [item('a', 100, 40), item('b', 200, 100)]
    const boxes = arrangePages(small, AREA, centred)
    // The shown page is centred both ways; the next one starts right
    // after it and is centred across the row.
    expect(positions(boxes)).toEqual([
      ['a', 100, 80],
      ['b', 200, 50],
    ])
    expect(boxes.get('b')).toMatchObject({ width: 200, height: 100 })
  })

  it('aligns to the top-left corner by default, like Studio', () => {
    const small = [item('a', 100, 40), item('b', 100, 40)]
    expect(positions(arrangePages(small, AREA, pages, 'b'))).toEqual([
      ['a', -100, 0],
      ['b', 0, 0],
    ])
  })

  it('orders pages by SortOrder', () => {
    const named = { ...pages, SortOrder: 'Name' as const }
    const boxes = arrangePages(
      [item('Shop', 300, 200), item('Bag', 300, 200)],
      AREA,
      named,
    )
    expect(positions(boxes)).toEqual([
      ['Bag', 0, 0],
      ['Shop', 300, 0],
    ])
  })

  it('handles no pages at all', () => {
    expect(arrangePages([], AREA, pages).size).toBe(0)
  })
})
