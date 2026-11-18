import { describe, expect, it } from 'vitest'
import { type ResizeStart, resizeBox } from './resize.ts'

// A 200 x 100 pixel box at (50, 50), anchored at its top-left corner.
const box: ResizeStart = {
  size: { xs: 0, xo: 200, ys: 0, yo: 100 },
  position: { xs: 0, xo: 50, ys: 0, yo: 50 },
  anchorPoint: { x: 0, y: 0 },
  pixelWidth: 200,
  pixelHeight: 100,
}

// The left and right edges in pixels, for a box whose Size and Position are
// Offset only, so we can check which edge stayed put.
function edgesX(r: { size: { xo: number }; position: { xo: number } }, ax = 0) {
  const left = r.position.xo - ax * r.size.xo
  return { left, right: left + r.size.xo }
}

describe('resizeBox', () => {
  it('right handle: grows the width, left edge stays', () => {
    const r = resizeBox(box, { x: 1, y: 0 }, 30, 999)
    expect(r.size).toEqual({ xs: 0, xo: 230, ys: 0, yo: 100 })
    expect(r.position).toEqual(box.position)
  })

  it('left handle: moves the left edge, right edge stays', () => {
    const r = resizeBox(box, { x: -1, y: 0 }, -30, 0)
    expect(edgesX(r)).toEqual({ left: 20, right: 250 })
  })

  it('bottom-right corner: resizes both axes', () => {
    const r = resizeBox(box, { x: 1, y: 1 }, 10, 20)
    expect(r.size).toEqual({ xs: 0, xo: 210, ys: 0, yo: 120 })
  })

  it('keeps the opposite edge still when the AnchorPoint is centered', () => {
    const centered = { ...box, anchorPoint: { x: 0.5, y: 0.5 } }
    const before = edgesX(centered, 0.5)

    const right = resizeBox(centered, { x: 1, y: 0 }, 40, 0)
    expect(edgesX(right, 0.5).left).toBe(before.left)

    const left = resizeBox(centered, { x: -1, y: 0 }, -40, 0)
    expect(edgesX(left, 0.5).right).toBe(before.right)
  })

  it('keeps the left edge still when anchored on the right', () => {
    const rightAnchored = { ...box, anchorPoint: { x: 1, y: 0 } }
    const before = edgesX(rightAnchored, 1)
    const r = resizeBox(rightAnchored, { x: 1, y: 0 }, 25, 0)
    expect(edgesX(r, 1).left).toBe(before.left)
  })

  it('never shrinks below 1 pixel', () => {
    const r = resizeBox(box, { x: 1, y: 1 }, -500, -500)
    expect(r.size.xo).toBe(1)
    expect(r.size.yo).toBe(1)
  })

  it('keeps Scale and only changes Offset', () => {
    // 50% of a 400 pixel parent + 0 = 200 pixels wide.
    const scaled = { ...box, size: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 } }
    const r = resizeBox(scaled, { x: 1, y: 0 }, 30, 0)
    expect(r.size).toEqual({ xs: 0.5, xo: 30, ys: 0.5, yo: 0 })
  })

  it('rounds to whole pixels', () => {
    const r = resizeBox(box, { x: 1, y: 0 }, 10.4, 0)
    expect(r.size.xo).toBe(210)
  })
})
