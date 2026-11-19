import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import {
  absoluteBox,
  boxInParent,
  fitAspect,
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
