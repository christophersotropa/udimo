import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import {
  ancestorIds,
  filterTree,
  inTreeOrder,
  isInside,
  topLevelNodes,
} from './tree.ts'

// ScreenGui > frame > button, plus a separate coins label.
function setup() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  const frame = addNode(rootId, 'Frame')
  const button = addNode(frame, 'TextLabel')
  const coins = addNode(rootId, 'TextLabel')
  return { doc: store.getState().document, rootId, frame, button, coins }
}

describe('isInside', () => {
  it('is true for the node itself, its parent and the root', () => {
    const { doc, rootId, frame, button } = setup()
    expect(isInside(doc, button, button)).toBe(true)
    expect(isInside(doc, button, frame)).toBe(true)
    expect(isInside(doc, button, rootId)).toBe(true)
  })

  it('is false for nodes outside it', () => {
    const { doc, frame, button, coins } = setup()
    expect(isInside(doc, frame, button)).toBe(false)
    expect(isInside(doc, button, coins)).toBe(false)
  })
})

describe('topLevelNodes', () => {
  it('drops a child when its parent is also in the list', () => {
    const { doc, frame, button, coins } = setup()
    expect(topLevelNodes(doc, [button, frame, coins])).toEqual([frame, coins])
  })

  it('keeps unrelated nodes', () => {
    const { doc, button, coins } = setup()
    expect(topLevelNodes(doc, [button, coins])).toEqual([button, coins])
  })
})

describe('ancestorIds', () => {
  it('lists the parent, then its parent, up to the root', () => {
    const { doc, rootId, frame, button } = setup()
    expect(ancestorIds(doc, button)).toEqual([frame, rootId])
  })

  it('is empty for the root', () => {
    const { doc, rootId } = setup()
    expect(ancestorIds(doc, rootId)).toEqual([])
  })
})

describe('inTreeOrder', () => {
  it('sorts ids top to bottom, as the Explorer lists them', () => {
    const { doc, frame, button, coins } = setup()
    expect(inTreeOrder(doc, [coins, button, frame])).toEqual([
      frame,
      button,
      coins,
    ])
  })
})

describe('filterTree', () => {
  it('shows matches and their parents', () => {
    const { doc, rootId, frame, button } = setup()
    // "textlabel" matches both TextLabels by class; the button's parent
    // (frame) and the root come along so the tree still makes sense.
    const shown = filterTree(doc, 'TEXTLABEL')!
    expect(shown.has(button)).toBe(true)
    expect(shown.has(frame)).toBe(true)
    expect(shown.has(rootId)).toBe(true)
  })

  it('leaves out what does not match', () => {
    const { doc, frame, button } = setup()
    const shown = filterTree(doc, 'Frame')!
    expect(shown.has(frame)).toBe(true)
    expect(shown.has(button)).toBe(false)
  })

  it('shows everything for an empty search', () => {
    expect(filterTree(setup().doc, '  ')).toBeNull()
  })
})
