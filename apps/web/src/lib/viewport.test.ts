import { describe, expect, it } from 'vitest'
import { clampZoom, fitView, MAX_ZOOM, MIN_ZOOM, zoomAt } from './viewport.ts'

describe('fitView', () => {
  it('fits the screen in the area with a margin, centered', () => {
    // 1064 × 600 area, 32px margins: 1000 × 536 to fill. A 2000 × 1000
    // screen fits at zoom 0.5 (1000 × 500), so it's centered vertically.
    expect(
      fitView({ width: 1064, height: 600 }, { width: 2000, height: 1000 }),
    ).toEqual({
      zoom: 0.5,
      x: 32,
      y: 50,
    })
  })

  it('never gives a negative zoom for a tiny area', () => {
    expect(
      fitView({ width: 10, height: 10 }, { width: 1920, height: 1080 }).zoom,
    ).toBe(0)
  })
})

describe('zoomAt', () => {
  it('keeps the spot under the pointer where it is', () => {
    const view = { zoom: 0.5, x: 100, y: 50 }
    const pointer = { x: 300, y: 250 } // over game pixel (400, 400)
    const zoomed = zoomAt(view, pointer, 2)
    expect(zoomed.zoom).toBe(2)
    // Game pixel (400, 400) is still under the pointer.
    expect(zoomed.x + 400 * zoomed.zoom).toBe(300)
    expect(zoomed.y + 400 * zoomed.zoom).toBe(250)
  })

  it('stays between the smallest and largest zoom', () => {
    const view = { zoom: 1, x: 0, y: 0 }
    expect(zoomAt(view, { x: 0, y: 0 }, 100).zoom).toBe(MAX_ZOOM)
    expect(clampZoom(0.001)).toBe(MIN_ZOOM)
  })
})
