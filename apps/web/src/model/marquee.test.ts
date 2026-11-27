import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { boxBetween, boxesOverlap, elementsInBox } from './marquee.ts'
import { SCREEN } from './screen.ts'

// Plain-pixel UDim2 helpers, to keep the setup readable.
const at = (x: number, y: number) => ({ xs: 0, xo: x, ys: 0, yo: y })
const size = (w: number, h: number) => ({ xs: 0, xo: w, ys: 0, yo: h })

// Like the Shop sample: a window with a button inside, and a coin counter
// in the top-left corner.
function setup() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  const coins = addNode(rootId, 'TextLabel', {
    Position: at(20, 20),
    Size: size(200, 50),
  })
  const shop = addNode(rootId, 'Frame', {
    Position: at(600, 300),
    Size: size(400, 300),
  })
  const buy = addNode(shop, 'TextButton', {
    Position: at(20, 20),
    Size: size(100, 40),
  })
  return { store, coins, shop, buy }
}

describe('boxBetween', () => {
  it('gives the same box whichever way the drag went', () => {
    const box = { x: 10, y: 20, width: 90, height: 60 }
    expect(boxBetween({ x: 10, y: 20 }, { x: 100, y: 80 })).toEqual(box)
    expect(boxBetween({ x: 100, y: 80 }, { x: 10, y: 20 })).toEqual(box)
    expect(boxBetween({ x: 100, y: 20 }, { x: 10, y: 80 })).toEqual(box)
  })
})

describe('boxesOverlap', () => {
  const a = { x: 0, y: 0, width: 100, height: 100 }

  it('is true when the boxes overlap at all', () => {
    expect(boxesOverlap(a, { x: 90, y: 90, width: 50, height: 50 })).toBe(true)
    expect(boxesOverlap(a, { x: 10, y: 10, width: 5, height: 5 })).toBe(true)
  })

  it('is false when they only share an edge, or are apart', () => {
    expect(boxesOverlap(a, { x: 100, y: 0, width: 50, height: 50 })).toBe(false)
    expect(boxesOverlap(a, { x: 200, y: 200, width: 5, height: 5 })).toBe(false)
  })
})

describe('elementsInBox', () => {
  it('picks every top-level element the box touches, in Explorer order', () => {
    const { store, coins, shop } = setup()
    const doc = store.getState().document
    // From below the shop window up to the coin counter's middle.
    const box = boxBetween({ x: 700, y: 700 }, { x: 100, y: 40 })
    expect(elementsInBox(doc, box, SCREEN)).toEqual([coins, shop])
  })

  it('picks the outer element, not the child the box touches', () => {
    const { store, shop } = setup()
    const doc = store.getState().document
    // Only over the Buy button (at 620, 320 on screen).
    const box = boxBetween({ x: 630, y: 330 }, { x: 640, y: 340 })
    expect(elementsInBox(doc, box, SCREEN)).toEqual([shop])
  })

  it('picks nothing in empty space', () => {
    const { store } = setup()
    const doc = store.getState().document
    const box = boxBetween({ x: 1500, y: 900 }, { x: 1600, y: 1000 })
    expect(elementsInBox(doc, box, SCREEN)).toEqual([])
  })

  it('skips hidden and locked elements', () => {
    const { store, coins, shop } = setup()
    store.getState().updateProps(coins, { Visible: false })
    store.getState().setLocked(shop, true)
    const doc = store.getState().document
    const everything = { x: 0, y: 0, ...SCREEN }
    expect(elementsInBox(doc, everything, SCREEN)).toEqual([])
  })
})
