import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { snapContext, snapMove, snapResize, snapTargets } from './snap.ts'

const SCREEN = { width: 1000, height: 500 }
const AREA = { width: 1000, height: 500 }
const box = (x: number, y: number, width = 100, height = 50) => ({
  x,
  y,
  width,
  height,
})

describe('snapMove', () => {
  const targets = snapTargets(AREA, [box(600, 300, 200, 100)])

  it("snaps an edge to the parent's edge when close enough", () => {
    const result = snapMove(box(4, 200), targets, 6)
    expect(result.dx).toBe(-4) // left edge to x = 0
    expect(result.dy).toBe(0)
  })

  it("snaps the center to the parent's center", () => {
    // Center at 503, parent center at 500.
    const result = snapMove(box(453, 100), targets, 6)
    expect(result.dx).toBe(-3)
    const guide = result.guides.find(
      (g) => g.axis === 'x' && g.position === 500,
    )
    expect(guide).toEqual({ axis: 'x', position: 500, from: 0, to: 500 })
  })

  it("snaps to a sibling's edge, with a guide from the sibling to the box", () => {
    // Left edge at 597, the sibling's left edge at 600.
    const result = snapMove(box(597, 100), targets, 6)
    expect(result.dx).toBe(3)
    expect(result.guides).toContainEqual({
      axis: 'x',
      position: 600,
      from: 100,
      to: 400,
    })
  })

  it('leaves the box alone when nothing is within reach', () => {
    const result = snapMove(box(200, 120), targets, 6)
    expect(result).toEqual({ dx: 0, dy: 0, guides: [] })
  })

  it('picks the closest line', () => {
    // Right edge 2px from the sibling's left edge (600); left edge 5px
    // from... nothing else close. Center 452: 48 from 500. So 600 wins.
    const result = snapMove(box(498, 100, 100), targets, 6)
    expect(result.dx).toBe(2)
  })
})

describe('snapResize', () => {
  const targets = snapTargets(AREA, [])

  it('snaps only the edge being dragged', () => {
    // Dragging the right edge to 997: it snaps to the parent's right (1000).
    const result = snapResize(
      box(800, 100, 197, 50),
      { x: 1, y: 0 },
      targets,
      6,
    )
    expect(result.dx).toBe(3)
    expect(result.dy).toBe(0)
    expect(result.guides).toHaveLength(1)
  })

  it("doesn't snap edges that aren't being dragged", () => {
    // The left edge is at 2 (close to 0), but only the right edge moves.
    const result = snapResize(box(2, 100, 300, 50), { x: 1, y: 0 }, targets, 6)
    expect(result.dx).toBe(0)
  })
})

describe('snapContext', () => {
  it("measures from the parent's content area, skipping hidden siblings", () => {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const panel = addNode(store.getState().document.rootId, 'Frame', {
      Position: { xs: 0, xo: 100, ys: 0, yo: 100 },
      Size: { xs: 0, xo: 400, ys: 0, yo: 300 },
    })
    addModifier(panel, 'UIPadding')
    updateModifier(panel, 'UIPadding', { PaddingLeft: { s: 0, o: 10 } })
    const dragged = addNode(panel, 'Frame', {
      Position: { xs: 0, xo: 20, ys: 0, yo: 30 },
    })
    addNode(panel, 'Frame', { Visible: false })

    const context = snapContext(store.getState().document, [dragged], SCREEN)!
    expect(context.origin).toEqual({ x: 110, y: 100 }) // inside the padding
    expect(context.start).toEqual(box(20, 30, 100, 100))
    // Only the parent area's three lines per axis: the hidden sibling is skipped.
    expect(context.targets.x.map((t) => t.position)).toEqual([0, 195, 390])
  })

  it('is null for elements with different parents', () => {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const rootId = store.getState().document.rootId
    const panel = addNode(rootId, 'Frame')
    const inside = addNode(panel, 'Frame')
    const outside = addNode(rootId, 'Frame')
    expect(
      snapContext(store.getState().document, [inside, outside], SCREEN),
    ).toBeNull()
  })
})

describe('guide labels', () => {
  it("labels the parent's center lines with its name", () => {
    const targets = snapTargets({ width: 1000, height: 500 }, [], 'Window')
    const [guide] = snapMove(
      { x: 448, y: 10, width: 100, height: 50 },
      targets,
      6,
    ).guides
    expect(guide).toMatchObject({
      axis: 'x',
      position: 500,
      label: 'Centered in Window',
    })
  })

  it('leaves edge lines unlabelled', () => {
    const targets = snapTargets({ width: 1000, height: 500 }, [], 'Window')
    const [guide] = snapMove(
      { x: 3, y: 200, width: 100, height: 50 },
      targets,
      6,
    ).guides
    expect(guide.label).toBeUndefined()
  })
})
