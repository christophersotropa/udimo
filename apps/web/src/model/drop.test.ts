import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { canDrop, dropPlaceAt } from './drop.ts'

// ScreenGui > frame > inner (Frame) and button (TextLabel), plus coins.
function setup() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  const frame = addNode(rootId, 'Frame')
  const inner = addNode(frame, 'Frame')
  const button = addNode(frame, 'TextLabel')
  const coins = addNode(rootId, 'TextLabel')
  return { doc: store.getState().document, rootId, frame, inner, button, coins }
}

describe('dropPlaceAt', () => {
  it('splits a row that can hold children into three bands', () => {
    expect(dropPlaceAt(0.1, true)).toBe('before')
    expect(dropPlaceAt(0.5, true)).toBe('inside')
    expect(dropPlaceAt(0.9, true)).toBe('after')
  })

  it('splits any other row in two', () => {
    expect(dropPlaceAt(0.4, false)).toBe('before')
    expect(dropPlaceAt(0.6, false)).toBe('after')
  })
})

describe('canDrop', () => {
  it('allows moving next to or into another element', () => {
    const { doc, rootId, frame, coins } = setup()
    expect(canDrop(doc, [coins], frame, 'inside')).toBe(true)
    expect(canDrop(doc, [coins], frame, 'before')).toBe(true)
    expect(canDrop(doc, [frame], rootId, 'inside')).toBe(true)
  })

  it('only drops inside the ScreenGui or a container', () => {
    const { doc, frame, coins } = setup()
    expect(canDrop(doc, [frame], coins, 'inside')).toBe(false)
  })

  it('never puts anything beside the ScreenGui', () => {
    const { doc, rootId, coins } = setup()
    expect(canDrop(doc, [coins], rootId, 'before')).toBe(false)
    expect(canDrop(doc, [coins], rootId, 'after')).toBe(false)
  })

  it('refuses to put an element inside itself or its own children', () => {
    const { doc, frame, inner, button } = setup()
    expect(canDrop(doc, [frame], frame, 'inside')).toBe(false)
    expect(canDrop(doc, [frame], inner, 'inside')).toBe(false)
    expect(canDrop(doc, [frame], button, 'after')).toBe(false)
  })

  it('refuses to drop a row next to itself', () => {
    const { doc, coins } = setup()
    expect(canDrop(doc, [coins], coins, 'before')).toBe(false)
  })

  it('refuses an empty drag', () => {
    const { doc, frame } = setup()
    expect(canDrop(doc, [], frame, 'inside')).toBe(false)
  })
})
