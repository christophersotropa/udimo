import { describe, expect, it } from 'vitest'
import { arrangeSelection, selectAll, selectChildren } from './commands.ts'
import { createDocumentStore } from './documentStore.ts'

// ScreenGui > a, b, c, d (in that drawing order: d is on top).
function setup() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  const [a, b, c, d] = [1, 2, 3, 4].map(() => addNode(rootId, 'Frame'))
  const order = () => store.getState().document.nodes[rootId].children
  const select = (...ids: string[]) =>
    ids.forEach((id, i) => store.getState().select(id, i > 0))
  return { store, order, select, a, b, c, d }
}

describe('arrangeSelection', () => {
  it('brings to the front and sends to the back', () => {
    const { store, order, select, a, b, c, d } = setup()
    select(a)
    arrangeSelection(store, 'front')
    expect(order()).toEqual([b, c, d, a])
    arrangeSelection(store, 'back')
    expect(order()).toEqual([a, b, c, d])
  })

  it('moves forward and backward one place, stopping at the ends', () => {
    const { store, order, select, a, b, c, d } = setup()
    select(b)
    arrangeSelection(store, 'forward')
    expect(order()).toEqual([a, c, b, d])
    arrangeSelection(store, 'backward')
    arrangeSelection(store, 'backward')
    arrangeSelection(store, 'backward') // already first: stays
    expect(order()).toEqual([b, a, c, d])
  })

  it('keeps several elements in their order, as one undo step', () => {
    const { store, order, select, a, b, c, d } = setup()
    const before = store.getState().document
    select(c, a)
    arrangeSelection(store, 'front')
    expect(order()).toEqual([b, d, a, c])
    store.getState().undo()
    expect(store.getState().document).toBe(before)
  })
})

describe('selectAll', () => {
  it('selects everything directly in the ScreenGui', () => {
    const { store, a, b, c, d } = setup()
    store.getState().addNode(a, 'TextLabel') // inside a: not selected
    selectAll(store)
    expect(store.getState().selection).toEqual([a, b, c, d])
  })
})

describe('arranging several elements', () => {
  it('keeps their order when sending to the back or stepping', () => {
    const { store, order, select, a, b, c, d } = setup()
    select(b, d)
    arrangeSelection(store, 'back')
    expect(order()).toEqual([b, d, a, c])
    arrangeSelection(store, 'forward') // each one place: b 0→1, d 1→2
    expect(order()).toEqual([a, b, d, c])
  })
})

describe('selectChildren', () => {
  it("selects an element's children, not deeper", () => {
    const { store, a } = setup()
    const { addNode } = store.getState()
    const one = addNode(a, 'TextLabel')
    const two = addNode(a, 'Frame')
    addNode(two, 'Frame') // a grandchild: not selected
    selectChildren(store, a)
    expect(store.getState().selection).toEqual([one, two])
  })

  it('leaves the selection alone when there are no children', () => {
    const { store, b, c } = setup()
    store.getState().select(c)
    selectChildren(store, b)
    expect(store.getState().selection).toEqual([c])
  })
})
