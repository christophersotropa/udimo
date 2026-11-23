import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import {
  clampSize,
  visualBox,
  absoluteBox,
  boxInParent,
  fitAspect,
  isLaidOut,
  visibleFraction,
} from './layout.ts'

const SCREEN = { width: 1000, height: 500 }

describe('boxInParent', () => {
  it('adds Scale × parent size to Offset', () => {
    const store = createDocumentStore()
    const id = store
      .getState()
      .addNode(store.getState().document.rootId, 'Frame', {
        Position: { xs: 0.5, xo: 10, ys: 0, yo: 20 },
        Size: { xs: 0.1, xo: 5, ys: 0, yo: 40 },
      })
    const node = store.getState().document.nodes[id]
    expect(boxInParent(node, SCREEN)).toEqual({
      x: 510,
      y: 20,
      width: 105,
      height: 40,
    })
  })

  it('shifts the box by AnchorPoint', () => {
    const store = createDocumentStore()
    const id = store
      .getState()
      .addNode(store.getState().document.rootId, 'Frame', {
        AnchorPoint: { x: 0.5, y: 1 },
        Position: { xs: 0.5, xo: 0, ys: 1, yo: 0 },
        Size: { xs: 0, xo: 200, ys: 0, yo: 100 },
      })
    const node = store.getState().document.nodes[id]
    // Centered horizontally, sitting on the bottom edge.
    expect(boxInParent(node, SCREEN)).toEqual({
      x: 400,
      y: 400,
      width: 200,
      height: 100,
    })
  })
})

describe('absoluteBox', () => {
  it('adds up the boxes of every parent', () => {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const rootId = store.getState().document.rootId
    const panel = addNode(rootId, 'Frame', {
      Position: { xs: 0, xo: 100, ys: 0, yo: 50 },
      Size: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 }, // 500 × 250
    })
    const child = addNode(panel, 'Frame', {
      Position: { xs: 0.5, xo: 0, ys: 0, yo: 10 },
      Size: { xs: 0, xo: 20, ys: 0, yo: 20 },
    })
    const doc = store.getState().document
    expect(absoluteBox(doc, rootId, SCREEN)).toEqual({ x: 0, y: 0, ...SCREEN })
    expect(absoluteBox(doc, child, SCREEN)).toEqual({
      x: 350,
      y: 60,
      width: 20,
      height: 20,
    })
  })
})

describe('ScrollingFrame', () => {
  // A 400 × 200 ScrollingFrame with the default CanvasSize (0, 0, 2, 0):
  // as wide as the frame, twice as tall.
  function setup(canvasSize = { xs: 0, xo: 0, ys: 2, yo: 0 }) {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const rootId = store.getState().document.rootId
    const scroller = addNode(rootId, 'ScrollingFrame', {
      Size: { xs: 0, xo: 400, ys: 0, yo: 200 },
      CanvasSize: canvasSize,
    })
    const child = addNode(scroller, 'Frame', {
      Position: { xs: 0, xo: 0, ys: 0.5, yo: 0 },
      Size: { xs: 1, xo: 0, ys: 0.5, yo: 0 },
    })
    return { doc: store.getState().document, scroller, child }
  }

  it('lays children out on the canvas, not the frame', () => {
    const { doc, child } = setup()
    // Scale Y is a fraction of the 400px-tall canvas, not the 200px frame.
    expect(absoluteBox(doc, child, SCREEN)).toEqual({
      x: 0,
      y: 200,
      width: 400,
      height: 200,
    })
  })

  it('never makes the canvas smaller than the frame', () => {
    const { doc, child } = setup({ xs: 0, xo: 0, ys: 0, yo: 50 })
    expect(absoluteBox(doc, child, SCREEN).height).toBe(100) // half of 200
  })

  it('works out how much of the canvas is in view', () => {
    const { doc, scroller } = setup()
    expect(visibleFraction(doc, scroller, SCREEN, 'y')).toBe(0.5)
    expect(visibleFraction(doc, scroller, SCREEN, 'x')).toBe(1)
  })
})

describe('UIAspectRatioConstraint', () => {
  it('fitAspect finds the biggest box of that shape inside the size', () => {
    expect(fitAspect(400, 100, 1)).toEqual({ width: 100, height: 100 })
    expect(fitAspect(100, 400, 2)).toEqual({ width: 100, height: 50 })
  })

  it('shrinks the element, keeping its AnchorPoint in place', () => {
    const store = createDocumentStore()
    const { addNode, addModifier } = store.getState()
    const id = addNode(store.getState().document.rootId, 'Frame', {
      AnchorPoint: { x: 0.5, y: 0.5 },
      Position: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 },
      Size: { xs: 0, xo: 300, ys: 0, yo: 100 },
    })
    addModifier(id, 'UIAspectRatioConstraint') // AspectRatio 1: a square
    const doc = store.getState().document
    // A 100 × 100 square, still centered on the 1000 × 500 screen.
    expect(absoluteBox(doc, id, SCREEN)).toEqual({
      x: 450,
      y: 200,
      width: 100,
      height: 100,
    })
  })
})

describe('UIPadding', () => {
  it('shrinks the area children are laid out in, and moves its corner', () => {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const panel = addNode(store.getState().document.rootId, 'Frame', {
      Size: { xs: 0, xo: 200, ys: 0, yo: 100 },
    })
    addModifier(panel, 'UIPadding')
    updateModifier(panel, 'UIPadding', {
      PaddingLeft: { s: 0, o: 20 },
      PaddingRight: { s: 0.1, o: 0 }, // 10% of 200 = 20
      PaddingTop: { s: 0, o: 10 },
    })
    const child = addNode(panel, 'Frame', {
      Size: { xs: 1, xo: 0, ys: 1, yo: 0 }, // fills the padded area
    })
    const doc = store.getState().document
    expect(absoluteBox(doc, child, SCREEN)).toEqual({
      x: 20,
      y: 10,
      width: 160,
      height: 90,
    })
  })
})

describe('children placed by a layout', () => {
  // A 400 × 300 Frame with a UIListLayout, holding three 100 × 50 labels.
  function setup() {
    const store = createDocumentStore()
    const { addNode, addModifier } = store.getState()
    const list = addNode(store.getState().document.rootId, 'Frame', {
      Position: { xs: 0, xo: 100, ys: 0, yo: 100 },
      Size: { xs: 0, xo: 400, ys: 0, yo: 300 },
    })
    addModifier(list, 'UIListLayout')
    const size = { xs: 0, xo: 100, ys: 0, yo: 50 }
    const a = addNode(list, 'TextLabel', {
      Size: size,
      Position: { xs: 0.5, xo: 999, ys: 0, yo: 0 }, // ignored
    })
    const b = addNode(list, 'TextLabel', { Size: size, Visible: false })
    const c = addNode(list, 'TextLabel', { Size: size })
    return { store, a, b, c }
  }

  it('ignore their Position, and hidden children leave no gap', () => {
    const { store, a, c } = setup()
    const doc = store.getState().document
    expect(absoluteBox(doc, a, SCREEN)).toEqual({
      x: 100,
      y: 100,
      width: 100,
      height: 50,
    })
    expect(absoluteBox(doc, c, SCREEN)).toEqual({
      x: 100,
      y: 150,
      width: 100,
      height: 50,
    })
  })

  it('are marked as laid out (visible ones only)', () => {
    const { store, a, b } = setup()
    const doc = store.getState().document
    expect(isLaidOut(doc, a)).toBe(true)
    expect(isLaidOut(doc, b)).toBe(false)
  })
})

describe('UISizeConstraint', () => {
  function constrained(size: {
    xs: number
    xo: number
    ys: number
    yo: number
  }) {
    const store = createDocumentStore()
    const id = store
      .getState()
      .addNode(store.getState().document.rootId, 'Frame', { Size: size })
    store.getState().addModifier(id, 'UISizeConstraint')
    store.getState().updateModifier(id, 'UISizeConstraint', {
      MinSize: { x: 50, y: 50 },
      MaxSize: { x: 400, y: null },
    })
    return boxInParent(store.getState().document.nodes[id], SCREEN)
  }

  it('keeps the box between MinSize and MaxSize', () => {
    // 80% of 1000 = 800 wide, capped at 400; 10px tall, raised to 50.
    const box = constrained({ xs: 0.8, xo: 0, ys: 0, yo: 10 })
    expect(box.width).toBe(400)
    expect(box.height).toBe(50)
  })

  it('has no maximum where MaxSize is null', () => {
    expect(constrained({ xs: 0, xo: 100, ys: 0, yo: 2000 }).height).toBe(2000)
  })

  it('lets the minimum win when the limits cross, like CSS', () => {
    expect(clampSize(10, 50, 30)).toBe(50)
    expect(clampSize(10, 0, null)).toBe(10)
  })
})

describe('visualBox (UIScale)', () => {
  // A 200×100 Frame centred at (500, 250), scaled ×2, with a child
  // 50×50 at its top-left corner.
  function scaled() {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const root = store.getState().document.rootId
    const frame = addNode(root, 'Frame', {
      Size: { xs: 0, xo: 200, ys: 0, yo: 100 },
      Position: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 },
      AnchorPoint: { x: 0.5, y: 0.5 },
    })
    addModifier(frame, 'UIScale')
    updateModifier(frame, 'UIScale', { Scale: 2 })
    const child = addNode(frame, 'Frame', {
      Size: { xs: 0, xo: 50, ys: 0, yo: 50 },
    })
    return { doc: store.getState().document, frame, child }
  }

  it('scales an element around its AnchorPoint', () => {
    const { doc, frame } = scaled()
    // 400×200, still centred at (500, 250).
    expect(visualBox(doc, frame, SCREEN)).toEqual({
      x: 300,
      y: 150,
      width: 400,
      height: 200,
    })
  })

  it('scales what’s inside with it, offsets included', () => {
    const { doc, child } = scaled()
    // 50×50 becomes 100×100, at the scaled frame's corner.
    expect(visualBox(doc, child, SCREEN)).toEqual({
      x: 300,
      y: 150,
      width: 100,
      height: 100,
    })
  })

  it('matches absoluteBox when nothing is scaled', () => {
    const store = createDocumentStore()
    const id = store
      .getState()
      .addNode(store.getState().document.rootId, 'Frame', {
        Position: { xs: 0.1, xo: 5, ys: 0, yo: 20 },
      })
    const doc = store.getState().document
    expect(visualBox(doc, id, SCREEN)).toEqual(absoluteBox(doc, id, SCREEN))
  })
})

// AutomaticSize, measured with the estimate in textMetrics.ts: each
// character half the text size wide, each line 1.25 × the text size tall.
describe('AutomaticSize', () => {
  const W = { xs: 0, xo: 0, ys: 0, yo: 0 }
  function setup() {
    const store = createDocumentStore()
    const root = store.getState().document.rootId
    return { store, root, s: store.getState() }
  }
  const boxOf = (store: ReturnType<typeof createDocumentStore>, id: string) =>
    absoluteBox(store.getState().document, id, SCREEN)

  it('grows a label across to fit its text', () => {
    const { store, root, s } = setup()
    // "Hello" at 20px: 5 × 10 = 50 wide.
    const id = s.addNode(root, 'TextLabel', {
      Size: { ...W, xo: 10, yo: 50 },
      Text: 'Hello',
      TextSize: 20,
      AutomaticSize: 'X',
    })
    expect(boxOf(store, id)).toMatchObject({ width: 50, height: 50 })
  })

  it('never shrinks below Size', () => {
    const { store, root, s } = setup()
    const id = s.addNode(root, 'TextLabel', {
      Size: { ...W, xo: 200, yo: 50 },
      Text: 'Hi',
      AutomaticSize: 'XY',
    })
    expect(boxOf(store, id)).toMatchObject({ width: 200, height: 50 })
  })

  it('wraps text at the width and grows down when only Y grows', () => {
    const { store, root, s } = setup()
    // Words 40px wide, spaces 10: "aaaa bbbb" (90) fits in 100, "cccc"
    // wraps: 2 lines × 25 = 50 tall.
    const id = s.addNode(root, 'TextLabel', {
      Size: { ...W, xo: 100, yo: 10 },
      Text: 'aaaa bbbb cccc',
      TextSize: 20,
      TextWrapped: true,
      AutomaticSize: 'Y',
    })
    expect(boxOf(store, id)).toMatchObject({ width: 100, height: 50 })
  })

  it('leaves TextScaled text to fit the box instead', () => {
    const { store, root, s } = setup()
    const id = s.addNode(root, 'TextLabel', {
      Size: { ...W, xo: 10, yo: 10 },
      Text: 'A long line of text',
      TextScaled: true,
      AutomaticSize: 'XY',
    })
    expect(boxOf(store, id)).toMatchObject({ width: 10, height: 10 })
  })

  it('grows a container to fit its children', () => {
    const { store, root, s } = setup()
    const frame = s.addNode(root, 'Frame', { Size: W, AutomaticSize: 'XY' })
    s.addNode(frame, 'Frame', {
      Position: { ...W, xo: 100, yo: 50 },
      Size: { ...W, xo: 80, yo: 40 },
    })
    expect(boxOf(store, frame)).toMatchObject({ width: 180, height: 90 })
  })

  it('grows to fit what its UIListLayout places, plus UIPadding', () => {
    const { store, root, s } = setup()
    const list = s.addNode(root, 'Frame', {
      Size: { ...W, xo: 200 },
      AutomaticSize: 'Y',
    })
    s.addModifier(list, 'UIListLayout')
    s.updateModifier(list, 'UIListLayout', { Padding: { s: 0, o: 5 } })
    s.addModifier(list, 'UIPadding')
    s.updateModifier(list, 'UIPadding', {
      PaddingTop: { s: 0, o: 10 },
      PaddingBottom: { s: 0, o: 10 },
    })
    for (let i = 0; i < 3; i++) {
      s.addNode(list, 'Frame', { Size: { ...W, xo: 50, yo: 30 } })
    }
    // 10 + 30 + 5 + 30 + 5 + 30 + 10 = 120.
    expect(boxOf(store, list)).toMatchObject({ width: 200, height: 120 })
  })

  it('grows away from its AnchorPoint', () => {
    const { store, root, s } = setup()
    const id = s.addNode(root, 'TextLabel', {
      Size: { ...W, xo: 10, yo: 50 },
      Position: { ...W, xo: 100, yo: 100 },
      AnchorPoint: { x: 0.5, y: 0 },
      Text: 'Hello',
      TextSize: 20,
      AutomaticSize: 'X',
    })
    // 50 wide, centred on x = 100.
    expect(boxOf(store, id)).toMatchObject({ x: 75, width: 50 })
  })

  it('stays within a UISizeConstraint', () => {
    const { store, root, s } = setup()
    const id = s.addNode(root, 'TextLabel', {
      Size: { ...W, xo: 10, yo: 50 },
      Text: 'A rather long label',
      TextSize: 20,
      AutomaticSize: 'X',
    })
    s.addModifier(id, 'UISizeConstraint')
    s.updateModifier(id, 'UISizeConstraint', { MaxSize: { x: 60, y: null } })
    expect(boxOf(store, id).width).toBe(60)
  })
})
