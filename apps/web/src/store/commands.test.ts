import { describe, expect, it } from 'vitest'
import {
  copySelection,
  cutSelection,
  deleteSelection,
  duplicateSelection,
  moveNodesTo,
  nudgeSelection,
  pasteFragment,
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

describe('moveNodesTo', () => {
  it('moves an element inside another, as its last child', () => {
    const { store, doc, panel, button, coins } = setup()
    expect(moveNodesTo(store, [coins], panel, 'inside')).toBe(true)
    expect(doc().nodes[panel].children).toEqual([button, coins])
    expect(doc().nodes[coins].parentId).toBe(panel)
  })

  it('reorders siblings, up and down', () => {
    const { store, doc, rootId, panel, coins } = setup()
    moveNodesTo(store, [coins], panel, 'before')
    expect(doc().nodes[rootId].children).toEqual([coins, panel])

    moveNodesTo(store, [coins], panel, 'after')
    expect(doc().nodes[rootId].children).toEqual([panel, coins])
  })

  it('moves an element down past a sibling, with more after it', () => {
    // Easy to get wrong: taking the element out shifts every later sibling
    // up one place, so the drop position must be counted without it.
    const { store, doc, rootId, panel, coins } = setup()
    const badge = store.getState().addNode(rootId, 'Frame')
    moveNodesTo(store, [panel], coins, 'after')
    expect(doc().nodes[rootId].children).toEqual([coins, panel, badge])
  })

  it('moves an element out of its parent', () => {
    const { store, doc, rootId, panel, button, coins } = setup()
    moveNodesTo(store, [button], panel, 'after')
    expect(doc().nodes[rootId].children).toEqual([panel, button, coins])
    expect(doc().nodes[panel].children).toEqual([])
  })

  it('keeps several elements in tree order, as one undo step', () => {
    const { store, doc, rootId, panel, button, coins } = setup()
    const before = doc()
    moveNodesTo(store, [coins, button], panel, 'before')
    expect(doc().nodes[rootId].children).toEqual([button, coins, panel])

    store.getState().undo()
    expect(doc()).toBe(before)
  })

  it('refuses a drop that is not allowed, changing nothing', () => {
    const { store, doc, panel, button } = setup()
    const before = doc()
    expect(moveNodesTo(store, [panel], button, 'after')).toBe(false)
    expect(doc()).toBe(before)
  })
})

describe('copy, cut and paste', () => {
  it('copy changes nothing; paste adds copies with new ids, selected', () => {
    const { store, doc, selection, rootId, panel } = setup()
    store.getState().select(panel)
    const before = doc()
    const fragment = copySelection(store)!
    expect(doc()).toBe(before)

    store.getState().clearSelection()
    pasteFragment(store, fragment)
    const [copy] = selection()
    expect(copy).not.toBe(panel)
    expect(doc().nodes[copy].name).toBe('Window')
    expect(doc().nodes[copy].parentId).toBe(rootId)
    expect(doc().nodes[copy].children).toHaveLength(1)
  })

  it('pastes beside the original and earlier copies, shifted off them', () => {
    const { store, doc, selection, rootId, panel } = setup()
    store.getState().select(panel)
    const fragment = copySelection(store)!

    // The original is still selected, but it's a copied Frame: the paste goes
    // beside it, shifted off it.
    const first = pasteFragment(store, fragment)
    expect(doc().nodes[first[0]].parentId).toBe(rootId)
    expect(doc().nodes[first[0]].props.Position).toEqual({
      xs: 0,
      xo: 120,
      ys: 0,
      yo: 120,
    })
    // Again, with the first copy selected: beside it too, a step further.
    const second = pasteFragment(store, fragment, first)
    expect(doc().nodes[second[0]].parentId).toBe(rootId)
    expect(doc().nodes[second[0]].props.Position?.xo).toBe(140)
    expect(selection()).toEqual(second)
  })

  it('pastes into a selected Frame without shifting', () => {
    const { store, doc, selection, panel, coins } = setup()
    store.getState().select(coins)
    const fragment = copySelection(store)!

    store.getState().select(panel)
    pasteFragment(store, fragment)
    const [copy] = selection()
    expect(doc().nodes[copy].parentId).toBe(panel)
    expect(doc().nodes[copy].props.Position?.xo).toBe(10)
  })

  it('paste is one undo step', () => {
    const { store, doc, panel } = setup()
    store.getState().select(panel)
    const fragment = copySelection(store)!
    const before = doc()
    pasteFragment(store, fragment)
    store.getState().undo()
    expect(doc()).toBe(before)
  })

  it('cut removes the elements, and paste brings them back', () => {
    const { store, doc, rootId, coins } = setup()
    store.getState().select(coins)
    const fragment = cutSelection(store)!
    expect(doc().nodes[coins]).toBeUndefined()

    pasteFragment(store, fragment)
    expect(doc().nodes[rootId].children).toHaveLength(2)
  })

  it('copy with nothing selected gives null', () => {
    expect(copySelection(setup().store)).toBeNull()
  })
})

describe('copies keep their modifiers', () => {
  it('when duplicating and pasting, including children', () => {
    const { store, doc, selection, panel, button } = setup()
    const { addModifier, updateModifier } = store.getState()
    addModifier(panel, 'UICorner')
    updateModifier(panel, 'UICorner', { CornerRadius: { s: 0.5, o: 0 } })
    addModifier(button, 'UIStroke')

    store.getState().select(panel)
    duplicateSelection(store)
    const duplicate = doc().nodes[selection()[0]]
    expect(duplicate.modifiers).toEqual({
      UICorner: { CornerRadius: { s: 0.5, o: 0 } },
    })
    expect(doc().nodes[duplicate.children[0]].modifiers).toEqual({
      UIStroke: {},
    })

    const fragment = copySelection(store)!
    pasteFragment(store, fragment)
    expect(doc().nodes[selection()[0]].modifiers?.UICorner).toBeDefined()
  })
})
