import { describe, expect, it } from 'vitest'
import {
  canvasColumn,
  clampPanelWidth,
  clampSplit,
  DEFAULT_PANEL_LAYOUT,
  draggedWidth,
  dropSpot,
  gridColumns,
  isSamePlace,
  loadPanelLayout,
  mirrored,
  movePanel,
  PANEL_LAYOUT_KEY,
  PANEL_MAX_WIDTH,
  PANEL_MIN_WIDTH,
  type PanelLayout,
  panelCell,
  panelRect,
  savePanelLayout,
  sideOf,
  SPLIT_MAX,
} from './panelLayout.ts'

// A stand-in for localStorage.
function fakeStorage(initial?: string) {
  const items = new Map<string, string>()
  if (initial !== undefined) items.set(PANEL_LAYOUT_KEY, initial)
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  }
}

// Both panels docked on the right, Explorer on top.
const STACKED: PanelLayout = {
  ...DEFAULT_PANEL_LAYOUT,
  left: [],
  right: ['explorer', 'properties'],
}

// The workspace, 1000 × 600, starting 50 px down the window.
const AREA = { x: 0, y: 50, width: 1000, height: 600 }

describe('sizes', () => {
  it('keep side widths between the limits, in whole pixels', () => {
    expect(clampPanelWidth(10)).toBe(PANEL_MIN_WIDTH)
    expect(clampPanelWidth(5000)).toBe(PANEL_MAX_WIDTH)
    expect(clampPanelWidth(250.6)).toBe(251)
  })

  it('grow a side when its inner edge is dragged toward the canvas', () => {
    // The left side's inner edge is its right one, and the other way round.
    expect(draggedWidth(240, 30, 'left')).toBe(270)
    expect(draggedWidth(280, 30, 'right')).toBe(250)
    expect(draggedWidth(280, -30, 'right')).toBe(310)
  })

  it('keep a stacked panel from being squeezed to nothing', () => {
    expect(clampSplit(0.99)).toBe(SPLIT_MAX)
    expect(clampSplit(0.4)).toBe(0.4)
  })
})

describe('dropSpot', () => {
  it('docks on the side under the pointer', () => {
    const left = dropSpot(
      DEFAULT_PANEL_LAYOUT,
      'properties',
      { x: 100, y: 100 },
      AREA,
    )
    expect(left.side).toBe('left')
    const right = dropSpot(
      DEFAULT_PANEL_LAYOUT,
      'explorer',
      { x: 900, y: 100 },
      AREA,
    )
    expect(right.side).toBe('right')
  })

  it('goes above or below a panel already there, by the pointer’s height', () => {
    // The workspace's middle is at y = 50 + 300 = 350.
    const above = { x: 900, y: 340 }
    const below = { x: 900, y: 360 }
    expect(dropSpot(DEFAULT_PANEL_LAYOUT, 'explorer', above, AREA)).toEqual({
      side: 'right',
      index: 0,
    })
    expect(dropSpot(DEFAULT_PANEL_LAYOUT, 'explorer', below, AREA)).toEqual({
      side: 'right',
      index: 1,
    })
  })

  it('docks alone on an empty side, whatever the height', () => {
    expect(dropSpot(STACKED, 'properties', { x: 100, y: 600 }, AREA)).toEqual({
      side: 'left',
      index: 0,
    })
  })
})

describe('movePanel', () => {
  it('stacks a panel on the other side', () => {
    const moved = movePanel(DEFAULT_PANEL_LAYOUT, 'explorer', {
      side: 'right',
      index: 0,
    })
    expect(moved.left).toEqual([])
    expect(moved.right).toEqual(['explorer', 'properties'])
  })

  it('reorders a stack', () => {
    const moved = movePanel(STACKED, 'explorer', { side: 'right', index: 1 })
    expect(moved.right).toEqual(['properties', 'explorer'])
  })

  it('knows when a drop would change nothing', () => {
    const spot = { side: 'left' as const, index: 0 }
    expect(isSamePlace(DEFAULT_PANEL_LAYOUT, 'explorer', spot)).toBe(true)
    expect(isSamePlace(STACKED, 'explorer', { side: 'right', index: 0 })).toBe(
      true,
    )
    expect(isSamePlace(STACKED, 'explorer', { side: 'right', index: 1 })).toBe(
      false,
    )
  })

  it('flips the layout left to right, widths and all', () => {
    const flipped = mirrored(DEFAULT_PANEL_LAYOUT)
    expect(flipped.left).toEqual(['properties'])
    expect(flipped.right).toEqual(['explorer'])
    expect(flipped.widths).toEqual({ left: 280, right: 240 })
    expect(mirrored(STACKED).left).toEqual(['explorer', 'properties'])
  })
})

describe('the workspace grid', () => {
  it('has a column for each side with panels', () => {
    expect(gridColumns(DEFAULT_PANEL_LAYOUT)).toBe('240px minmax(0, 1fr) 280px')
    expect(gridColumns(STACKED)).toBe('minmax(0, 1fr) 280px')
    expect(canvasColumn(STACKED)).toBe(1)
  })

  it('gives a lone panel both rows, and stacked panels one each', () => {
    expect(panelCell(DEFAULT_PANEL_LAYOUT, 'properties')).toEqual({
      gridColumn: 3,
      gridRow: '1 / 3',
    })
    expect(panelCell(STACKED, 'explorer')).toEqual({
      gridColumn: 2,
      gridRow: '1',
    })
    expect(panelCell(STACKED, 'properties')).toEqual({
      gridColumn: 2,
      gridRow: '2',
    })
    expect(sideOf(STACKED, 'properties')).toBe('right')
  })

  it('works out a panel’s rectangle, for the drop preview', () => {
    const area = { width: 1000, height: 600 }
    expect(panelRect(DEFAULT_PANEL_LAYOUT, 'explorer', area)).toEqual({
      x: 0,
      y: 0,
      width: 240,
      height: 600,
    })
    const split = { ...STACKED, split: 0.25 }
    expect(panelRect(split, 'properties', area)).toEqual({
      x: 720,
      y: 150,
      width: 280,
      height: 450,
    })
  })
})

describe('saving the layout', () => {
  it('gives back what was saved', () => {
    const storage = fakeStorage()
    const layout = { ...STACKED, widths: { left: 300, right: 260 }, split: 0.3 }
    savePanelLayout(storage, layout)
    expect(loadPanelLayout(storage)).toEqual(layout)
  })

  it('uses the default when nothing is saved', () => {
    expect(loadPanelLayout(fakeStorage())).toEqual(DEFAULT_PANEL_LAYOUT)
  })

  it('uses the default when the saved layout is broken', () => {
    const widths = '"widths":{"left":240,"right":280}'
    for (const text of [
      'not json',
      'null',
      // the layout from before panels could share a side
      '{"left":"explorer","widths":{"explorer":240,"properties":280}}',
      `{"left":["canvas"],"right":["properties"],${widths},"split":0.5}`,
      `{"left":["explorer"],"right":[],${widths},"split":0.5}`, // one missing
      `{"left":["explorer"],"right":["explorer","properties"],${widths},"split":0.5}`,
      `{"left":["explorer"],"right":["properties"],${widths}}`, // no split
    ]) {
      expect(loadPanelLayout(fakeStorage(text))).toEqual(DEFAULT_PANEL_LAYOUT)
    }
  })

  it('pulls saved sizes back inside the limits', () => {
    const text =
      '{"left":["explorer"],"right":["properties"],"widths":{"left":9999,"right":1},"split":2}'
    const layout = loadPanelLayout(fakeStorage(text))
    expect(layout.widths).toEqual({
      left: PANEL_MAX_WIDTH,
      right: PANEL_MIN_WIDTH,
    })
    expect(layout.split).toBe(SPLIT_MAX)
  })

  it('doesn’t throw when storage is full', () => {
    const full = {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(() => savePanelLayout(full, DEFAULT_PANEL_LAYOUT)).not.toThrow()
  })
})
