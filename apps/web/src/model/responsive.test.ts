import { describe, expect, it } from 'vitest'
import { convertUnits } from '../store/commands.ts'
import { createDocumentStore } from '../store/documentStore.ts'
import { absoluteBox } from './layout.ts'
import { convertUDim2, planUnitConversion } from './responsive.ts'

const SCREEN = { width: 1000, height: 500 }

describe('convertUDim2', () => {
  it('turns Offset into Scale of the parent', () => {
    expect(
      convertUDim2({ xs: 0, xo: 250, ys: 0.1, yo: 50 }, SCREEN, 'scale'),
    ).toEqual({ xs: 0.25, xo: 0, ys: 0.2, yo: 0 })
  })

  it('turns Scale into whole pixels', () => {
    expect(
      convertUDim2({ xs: 0.333, xo: 10, ys: 0.5, yo: 0 }, SCREEN, 'offset'),
    ).toEqual({ xs: 0, xo: 343, ys: 0, yo: 250 })
  })

  it('comes back to the same pixels after a round trip', () => {
    const start = { xs: 0, xo: 123, ys: 0, yo: 77 }
    const screen = { width: 1920, height: 1080 }
    const there = convertUDim2(start, screen, 'scale')
    expect(convertUDim2(there, screen, 'offset')).toEqual(start)
  })
})

describe('making a window responsive', () => {
  // A pixel-sized window with a pixel-sized button inside, both anchored
  // in odd ways.
  function setup() {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const rootId = store.getState().document.rootId
    const panel = addNode(rootId, 'Frame', {
      AnchorPoint: { x: 0.5, y: 0.5 },
      Position: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 },
      Size: { xs: 0, xo: 400, ys: 0, yo: 300 },
    })
    const button = addNode(panel, 'TextButton', {
      AnchorPoint: { x: 1, y: 1 },
      Position: { xs: 1, xo: -20, ys: 1, yo: -20 },
      Size: { xs: 0, xo: 120, ys: 0, yo: 40 },
    })
    return { store, panel, button }
  }

  it('converts the element and everything inside it, moving nothing', () => {
    const { store, panel, button } = setup()
    const before = store.getState().document
    convertUnits(store, [panel], 'scale', SCREEN)
    const after = store.getState().document

    expect(after.nodes[panel].props.Size).toEqual({
      xs: 0.4,
      xo: 0,
      ys: 0.6,
      yo: 0,
    })
    expect(after.nodes[button].props.Size).toEqual({
      xs: 0.3,
      xo: 0,
      ys: 0.1333,
      yo: 0,
    })
    for (const id of [panel, button]) {
      const was = absoluteBox(before, id, SCREEN)
      const now = absoluteBox(after, id, SCREEN)
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(now[key] - was[key])).toBeLessThan(0.5)
      }
    }
  })

  it('then grows with the screen', () => {
    const { store, panel } = setup()
    convertUnits(store, [panel], 'scale', SCREEN)
    const bigger = absoluteBox(store.getState().document, panel, {
      width: 2000,
      height: 1000,
    })
    expect(bigger.width).toBe(800) // twice the screen, twice the size
  })

  it('is one undo step, and Use pixels converts back', () => {
    const { store, panel, button } = setup()
    const before = store.getState().document
    convertUnits(store, [panel], 'scale', SCREEN)
    store.getState().undo()
    expect(store.getState().document).toBe(before)

    convertUnits(store, [panel], 'scale', SCREEN)
    convertUnits(store, [panel], 'offset', SCREEN)
    const doc = store.getState().document
    // Pixels now: the button sits 20px in from the window's 400 × 300
    // bottom-right corner, at (380, 280).
    expect(doc.nodes[panel].props.Size).toEqual({
      xs: 0,
      xo: 400,
      ys: 0,
      yo: 300,
    })
    expect(doc.nodes[button].props.Position).toEqual({
      xs: 0,
      xo: 380,
      ys: 0,
      yo: 280,
    })
  })

  it('converts a child selected with its parent only once', () => {
    const { store, panel, button } = setup()
    const plan = planUnitConversion(
      store.getState().document,
      [button, panel],
      'scale',
      SCREEN,
    )
    expect([...plan.keys()]).toEqual([panel, button])
  })
})
