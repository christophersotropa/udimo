import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { wrapSelectionInFrame } from '../store/commands.ts'
import { absoluteBox } from './layout.ts'
import { planWrap } from './wrap.ts'

const SCREEN = { width: 1920, height: 1080 }

function expectSameBox(
  actual: ReturnType<typeof absoluteBox>,
  expected: ReturnType<typeof absoluteBox>,
) {
  // toBeCloseTo allows for tiny floating-point differences.
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(actual[key]).toBeCloseTo(expected[key], 6)
  }
}

describe('planWrap', () => {
  it('fits an Offset Frame around Offset elements', () => {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const rootId = store.getState().document.rootId
    const a = addNode(rootId, 'Frame', {
      Position: { xs: 0, xo: 100, ys: 0, yo: 100 },
      Size: { xs: 0, xo: 50, ys: 0, yo: 50 },
    })
    const b = addNode(rootId, 'Frame', {
      Position: { xs: 0, xo: 300, ys: 0, yo: 200 },
      Size: { xs: 0, xo: 100, ys: 0, yo: 20 },
    })

    const plan = planWrap(store.getState().document, [b, a], SCREEN)!
    expect(plan.parentId).toBe(rootId)
    expect(plan.index).toBe(0)
    expect(plan.frameProps.Position).toEqual({ xs: 0, xo: 100, ys: 0, yo: 100 })
    expect(plan.frameProps.Size).toEqual({ xs: 0, xo: 300, ys: 0, yo: 120 })
    expect(plan.frameProps.BackgroundTransparency).toBe(1)
    expect(plan.children.map((c) => c.id)).toEqual([a, b]) // tree order
    expect(plan.children[1].props.Position).toEqual({
      xs: 0,
      xo: 200,
      ys: 0,
      yo: 100,
    })
  })

  it('refuses elements with different parents, or nothing', () => {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const rootId = store.getState().document.rootId
    const panel = addNode(rootId, 'Frame')
    const inside = addNode(panel, 'Frame')
    const outside = addNode(rootId, 'Frame')
    const doc = store.getState().document
    expect(planWrap(doc, [inside, outside], SCREEN)).toBeNull()
    expect(planWrap(doc, [], SCREEN)).toBeNull()
  })
})

describe('wrapSelectionInFrame', () => {
  // A Scale window with three very different children inside it.
  function setup() {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const rootId = store.getState().document.rootId
    const panel = addNode(rootId, 'Frame', {
      AnchorPoint: { x: 0.5, y: 0.5 },
      Position: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 },
      Size: { xs: 0.4, xo: 0, ys: 0.5, yo: 0 },
    })
    const offsetChild = addNode(panel, 'Frame', {
      Position: { xs: 0, xo: 24, ys: 0, yo: 30 },
      Size: { xs: 0, xo: 120, ys: 0, yo: 40 },
    })
    const scaleChild = addNode(panel, 'TextLabel', {
      Position: { xs: 0.5, xo: 0, ys: 0.6, yo: 0 },
      Size: { xs: 0.3, xo: 0, ys: 0.1, yo: 0 },
      ZIndex: 3,
    })
    const anchoredChild = addNode(panel, 'Frame', {
      AnchorPoint: { x: 1, y: 1 },
      Position: { xs: 1, xo: -16, ys: 1, yo: -16 },
      Size: { xs: 0.2, xo: 10, ys: 0, yo: 48 },
    })
    const keep = addNode(panel, 'Frame') // not wrapped
    return {
      store,
      rootId,
      panel,
      offsetChild,
      scaleChild,
      anchoredChild,
      keep,
    }
  }

  it('moves nothing on screen', () => {
    const { store, offsetChild, scaleChild, anchoredChild } = setup()
    const wrapped = [offsetChild, scaleChild, anchoredChild]
    const before = store.getState().document
    store.getState().select(offsetChild)
    store.getState().select(scaleChild, true)
    store.getState().select(anchoredChild, true)

    expect(wrapSelectionInFrame(store, SCREEN)).toBe(true)
    const after = store.getState().document
    for (const id of wrapped) {
      expectSameBox(
        absoluteBox(after, id, SCREEN),
        absoluteBox(before, id, SCREEN),
      )
    }
  })

  it('puts the Frame where the elements were, selected, as one undo step', () => {
    const { store, panel, offsetChild, scaleChild, keep } = setup()
    const before = store.getState().document
    store.getState().select(scaleChild)
    store.getState().select(offsetChild, true)
    wrapSelectionInFrame(store, SCREEN)

    const doc = store.getState().document
    const [frameId] = store.getState().selection
    const frame = doc.nodes[frameId]
    expect(frame.className).toBe('Frame')
    expect(frame.children).toEqual([offsetChild, scaleChild])
    expect(frame.props.ZIndex).toBe(3) // the highest of what it wraps
    expect(frame.props.Position?.xs).toBeGreaterThan(0) // Scale, like its children
    expect(doc.nodes[panel].children[0]).toBe(frameId)
    expect(doc.nodes[panel].children).toContain(keep)

    store.getState().undo()
    expect(store.getState().document).toBe(before)
  })

  it('does nothing when the selection cannot be wrapped', () => {
    const { store } = setup()
    const before = store.getState().document
    expect(wrapSelectionInFrame(store, SCREEN)).toBe(false)
    expect(store.getState().document).toBe(before)
  })
})

describe('wrapping inside a ScrollingFrame', () => {
  it('moves nothing on screen', () => {
    const store = createDocumentStore()
    const { addNode, select } = store.getState()
    const rootId = store.getState().document.rootId
    const scroller = addNode(rootId, 'ScrollingFrame', {
      Size: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 },
    })
    // A pixel offset on the Y axis: Scale-only layouts come out the same
    // whatever size you assume, so they wouldn't catch a wrong canvas size.
    const a = addNode(scroller, 'Frame', {
      Position: { xs: 0, xo: 10, ys: 0, yo: 30 },
      Size: { xs: 0.5, xo: 0, ys: 0.1, yo: 0 },
    })
    const b = addNode(scroller, 'TextLabel', {
      Position: { xs: 0.5, xo: 0, ys: 0.6, yo: 0 },
    })
    const before = store.getState().document
    select(a)
    select(b, true)

    wrapSelectionInFrame(store, SCREEN)
    const after = store.getState().document
    for (const id of [a, b]) {
      expectSameBox(
        absoluteBox(after, id, SCREEN),
        absoluteBox(before, id, SCREEN),
      )
    }
  })
})
