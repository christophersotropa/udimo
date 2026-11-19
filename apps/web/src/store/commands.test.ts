import { describe, expect, it } from 'vitest'
import {
  deleteSelection,
  duplicateSelection,
  nudgeSelection,
  toggleLocked,
  toggleVisible,
} from './commands.ts'
import { createDocumentStore } from './documentStore.ts'

// ScreenGui > panel (at 100, 100) > button, plus coins (at 10, 10).
function setup() {
  const store = createDocumentStore()
  const { addNode, renameNode } = store.getState()
  const rootId = store.getState().document.rootId
  const panel = addNode(rootId, 'Frame', {
    Position: { xs: 0, xo: 100, ys: 0, yo: 100 },
  })
  renameNode(panel, 'Window')
  const button = addNode(panel, 'TextLabel', { Text: 'Buy' })
  const coins = addNode(rootId, 'TextLabel', {
    Position: { xs: 0, xo: 10, ys: 0, yo: 10 },
  })
  const doc = () => store.getState().document
  const selection = () => store.getState().selection
  return { store, doc, selection, rootId, panel, button, coins }
}

describe('deleteSelection', () => {
  it('deletes every selected element, as one undo step', () => {
    const { store, doc, panel, coins } = setup()
    store.getState().select(panel)
    store.getState().select(coins, true)
    const before = doc()

    deleteSelection(store)
    expect(Object.keys(doc().nodes)).toEqual([doc().rootId])

    store.getState().undo()
    expect(doc()).toBe(before)
  })

  it('handles a child selected together with its parent', () => {
    const { store, doc, panel, button } = setup()
    store.getState().select(button)
    store.getState().select(panel, true)
    deleteSelection(store) // would throw if it tried to delete button twice
    expect(doc().nodes[panel]).toBeUndefined()
  })

  it('does nothing with nothing selected', () => {
    const { store, doc } = setup()
    const before = doc()
    deleteSelection(store)
    expect(doc()).toBe(before)
  })
})

describe('nudgeSelection', () => {
  it('moves Offset only, as one undo step', () => {
    const { store, doc, panel, coins } = setup()
    store.getState().select(panel)
    store.getState().select(coins, true)

    nudgeSelection(store, 10, -1)
    expect(doc().nodes[panel].props.Position).toEqual({
      xs: 0,
      xo: 110,
      ys: 0,
      yo: 99,
    })
    expect(doc().nodes[coins].props.Position?.xo).toBe(20)

    store.getState().undo()
    expect(doc().nodes[panel].props.Position?.xo).toBe(100)
    expect(doc().nodes[coins].props.Position?.xo).toBe(10)
  })

  it('moves a child selected with its parent only once', () => {
    const { store, doc, panel, button } = setup()
    store.getState().select(panel)
    store.getState().select(button, true)
    nudgeSelection(store, 5, 0)
    expect(doc().nodes[button].props.Position).toBeUndefined()
  })
})

describe('duplicateSelection', () => {
  it('copies an element and its children with new ids', () => {
    const { store, doc, rootId, panel, button } = setup()
    store.getState().select(panel)
    duplicateSelection(store)

    const [copy] = store.getState().selection
    expect(copy).not.toBe(panel)
    const copyNode = doc().nodes[copy]
    expect(copyNode.name).toBe('Window')
    expect(copyNode.parentId).toBe(rootId)
    expect(copyNode.children).toHaveLength(1)

    const copiedChild = doc().nodes[copyNode.children[0]]
    expect(copiedChild.id).not.toBe(button)
    expect(copiedChild.props.Text).toBe('Buy')
  })

  it('places the copy right after the original, shifted 20px', () => {
    const { store, doc, rootId, panel, coins } = setup()
    store.getState().select(panel)
    duplicateSelection(store)

    const [copy] = store.getState().selection
    expect(doc().nodes[rootId].children).toEqual([panel, copy, coins])
    expect(doc().nodes[copy].props.Position).toEqual({
      xs: 0,
      xo: 120,
      ys: 0,
      yo: 120,
    })
  })

  it('selects all the copies', () => {
    const { store, selection, panel, coins } = setup()
    store.getState().select(panel)
    store.getState().select(coins, true)
    duplicateSelection(store)

    expect(selection()).toHaveLength(2)
    expect(selection()).not.toContain(panel)
    expect(selection()).not.toContain(coins)
  })

  it('is undone in one step', () => {
    const { store, doc, panel } = setup()
    store.getState().select(panel)
    const before = doc()
    duplicateSelection(store)

    store.getState().undo()
    expect(doc()).toBe(before)
  })
})

describe('toggleVisible', () => {
  it('sets Visible to false, then removes it again', () => {
    const { store, doc, panel } = setup()
    toggleVisible(store, panel)
    expect(doc().nodes[panel].props.Visible).toBe(false)

    toggleVisible(store, panel)
    expect('Visible' in doc().nodes[panel].props).toBe(false)
  })
})

describe('toggleLocked', () => {
  it('locks, then unlocks', () => {
    const { store, doc, panel } = setup()
    toggleLocked(store, panel)
    expect(doc().nodes[panel].locked).toBe(true)

    toggleLocked(store, panel)
    expect(doc().nodes[panel].locked).toBeUndefined()
  })
})
