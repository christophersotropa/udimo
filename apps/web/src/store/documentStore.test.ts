import { describe, expect, it } from 'vitest'
import type { UiDocument } from '../model/types.ts'
import { createDocumentStore } from './documentStore.ts'

// Checks the rule every document must follow: each node's parentId and its
// parent's children list agree, and every node can be reached from the root.
function expectConsistent(doc: UiDocument) {
  const root = doc.nodes[doc.rootId]
  expect(root.parentId).toBeNull()

  const reached = new Set<string>()
  const queue = [doc.rootId]
  while (queue.length > 0) {
    const node = doc.nodes[queue.shift()!]
    expect(reached.has(node.id)).toBe(false) // no node listed twice
    reached.add(node.id)
    for (const childId of node.children) {
      expect(doc.nodes[childId]?.parentId).toBe(node.id)
      queue.push(childId)
    }
  }
  expect(reached.size).toBe(Object.keys(doc.nodes).length) // nothing orphaned
}

// A fresh store for each test, plus shortcuts to its actions and document.
function setup() {
  const store = createDocumentStore()
  const actions = store.getState()
  const doc = () => store.getState().document
  const selection = () => store.getState().selection
  const rootId = doc().rootId
  return { actions, doc, selection, rootId }
}

describe('document store', () => {
  it('starts with only a ScreenGui root', () => {
    const { doc, rootId } = setup()
    expect(Object.keys(doc().nodes)).toEqual([rootId])
    expect(doc().nodes[rootId].className).toBe('ScreenGui')
  })

  it('loadDocument replaces the whole document', () => {
    const { actions, doc } = setup()
    const other = createDocumentStore()
    other.getState().addNode(other.getState().document.rootId, 'Frame')

    actions.loadDocument(other.getState().document)
    expect(doc()).toEqual(other.getState().document)
  })

  describe('addNode', () => {
    it('adds a child named after its class and returns its id', () => {
      const { actions, doc, rootId } = setup()
      const id = actions.addNode(rootId, 'Frame', {
        Size: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 },
      })

      const node = doc().nodes[id]
      expect(node.className).toBe('Frame')
      expect(node.name).toBe('Frame')
      expect(node.parentId).toBe(rootId)
      expect(node.props.Size).toEqual({ xs: 0.5, xo: 0, ys: 0.5, yo: 0 })
      expect(doc().nodes[rootId].children).toEqual([id])
      expectConsistent(doc())
    })

    it('keeps children in the order they were added', () => {
      const { actions, doc, rootId } = setup()
      const a = actions.addNode(rootId, 'Frame')
      const b = actions.addNode(rootId, 'TextLabel')
      expect(doc().nodes[rootId].children).toEqual([a, b])
    })

    it('throws for a missing parent and changes nothing', () => {
      const { actions, doc } = setup()
      const before = doc()
      expect(() => actions.addNode('nope', 'Frame')).toThrow('No node')
      expect(doc()).toBe(before)
    })
  })

  it('renameNode changes the name', () => {
    const { actions, doc, rootId } = setup()
    const id = actions.addNode(rootId, 'Frame')
    actions.renameNode(id, 'Window')
    expect(doc().nodes[id].name).toBe('Window')
  })

  it('updateProps merges props, and undefined removes one', () => {
    const { actions, doc, rootId } = setup()
    const id = actions.addNode(rootId, 'TextLabel', {
      Text: 'Hi',
      TextSize: 14,
    })

    actions.updateProps(id, { TextSize: 24, Visible: false })
    expect(doc().nodes[id].props).toEqual({
      Text: 'Hi',
      TextSize: 24,
      Visible: false,
    })

    actions.updateProps(id, { Text: undefined })
    expect(doc().nodes[id].props).toEqual({ TextSize: 24, Visible: false })
  })

  describe('moveNode', () => {
    it('moves a node to a new parent', () => {
      const { actions, doc, rootId } = setup()
      const window = actions.addNode(rootId, 'Frame')
      const label = actions.addNode(rootId, 'TextLabel')

      actions.moveNode(label, window)
      expect(doc().nodes[label].parentId).toBe(window)
      expect(doc().nodes[window].children).toEqual([label])
      expect(doc().nodes[rootId].children).toEqual([window])
      expectConsistent(doc())
    })

    it('reorders within the same parent', () => {
      const { actions, doc, rootId } = setup()
      const a = actions.addNode(rootId, 'Frame')
      const b = actions.addNode(rootId, 'Frame')
      const c = actions.addNode(rootId, 'Frame')

      actions.moveNode(c, rootId, 0)
      expect(doc().nodes[rootId].children).toEqual([c, a, b])
      expectConsistent(doc())
    })

    it('refuses to move a node into its own child', () => {
      const { actions, doc, rootId } = setup()
      const outer = actions.addNode(rootId, 'Frame')
      const inner = actions.addNode(outer, 'Frame')
      const before = doc()

      expect(() => actions.moveNode(outer, inner)).toThrow('into itself')
      expect(() => actions.moveNode(outer, outer)).toThrow('into itself')
      expect(doc()).toBe(before)
    })

    it('refuses to move the root', () => {
      const { actions, rootId } = setup()
      const frame = actions.addNode(rootId, 'Frame')
      expect(() => actions.moveNode(rootId, frame)).toThrow('root')
    })
  })

  describe('setLocked', () => {
    it('locks, and unlocking removes the field', () => {
      const { actions, doc, rootId } = setup()
      const frame = actions.addNode(rootId, 'Frame')

      actions.setLocked(frame, true)
      expect(doc().nodes[frame].locked).toBe(true)

      actions.setLocked(frame, false)
      expect('locked' in doc().nodes[frame]).toBe(false)
    })

    it('is undoable, and unlocking an unlocked element saves no step', () => {
      const { actions, doc, rootId } = setup()
      const frame = actions.addNode(rootId, 'Frame')
      const before = doc()

      actions.setLocked(frame, false) // already unlocked: nothing to undo
      actions.setLocked(frame, true)
      actions.undo()
      expect(doc()).toBe(before)
    })
  })

  describe('modifiers', () => {
    it('adds, updates and removes a modifier', () => {
      const { actions, doc, rootId } = setup()
      const frame = actions.addNode(rootId, 'Frame')

      actions.addModifier(frame, 'UICorner')
      expect(doc().nodes[frame].modifiers).toEqual({ UICorner: {} })

      actions.updateModifier(frame, 'UICorner', {
        CornerRadius: { s: 0, o: 12 },
      })
      expect(doc().nodes[frame].modifiers?.UICorner?.CornerRadius?.o).toBe(12)

      actions.removeModifier(frame, 'UICorner')
      expect('modifiers' in doc().nodes[frame]).toBe(false) // tidied away
    })

    it('saves no undo step for adding a modifier that is already on', () => {
      const { actions, doc, rootId } = setup()
      const frame = actions.addNode(rootId, 'Frame')
      actions.addModifier(frame, 'UIStroke')
      actions.updateModifier(frame, 'UIStroke', { Thickness: 4 })
      const before = doc()

      actions.addModifier(frame, 'UIStroke') // keeps Thickness 4
      expect(doc()).toBe(before)
      actions.undo()
      expect(doc().nodes[frame].modifiers?.UIStroke).toEqual({})
    })

    it('refuses to update a modifier the element does not have', () => {
      const { actions, rootId } = setup()
      const frame = actions.addNode(rootId, 'Frame')
      expect(() =>
        actions.updateModifier(frame, 'UIStroke', { Thickness: 2 }),
      ).toThrow('no UIStroke')
    })

    it('keeps one layout per element: a new one replaces the old', () => {
      const { actions, doc, rootId } = setup()
      const frame = actions.addNode(rootId, 'Frame')
      actions.addModifier(frame, 'UIListLayout')
      actions.addModifier(frame, 'UICorner')
      actions.addModifier(frame, 'UIGridLayout')
      expect(Object.keys(doc().nodes[frame].modifiers ?? {}).sort()).toEqual([
        'UICorner',
        'UIGridLayout',
      ])
      actions.addModifier(frame, 'UIPageLayout')
      expect(Object.keys(doc().nodes[frame].modifiers ?? {}).sort()).toEqual([
        'UICorner',
        'UIPageLayout',
      ])
    })

    it('refuses modifiers on the ScreenGui', () => {
      const { actions, rootId } = setup()
      expect(() => actions.addModifier(rootId, 'UICorner')).toThrow('root')
    })
  })

  describe('deleteNode', () => {
    it('deletes a node and everything inside it', () => {
      const { actions, doc, rootId } = setup()
      const keep = actions.addNode(rootId, 'Frame')
      const window = actions.addNode(rootId, 'Frame')
      const header = actions.addNode(window, 'Frame')
      actions.addNode(header, 'TextLabel')

      actions.deleteNode(window)
      expect(Object.keys(doc().nodes).sort()).toEqual([keep, rootId].sort())
      expect(doc().nodes[rootId].children).toEqual([keep])
      expectConsistent(doc())
    })

    it('refuses to delete the root', () => {
      const { actions, rootId } = setup()
      expect(() => actions.deleteNode(rootId)).toThrow('root')
    })
  })

  it('never edits the old document in place (Immer makes a new one)', () => {
    const { actions, doc, rootId } = setup()
    const before = doc()
    actions.addNode(rootId, 'Frame')

    expect(doc()).not.toBe(before)
    expect(before.nodes[rootId].children).toEqual([])
  })

  describe('selection', () => {
    it('starts empty', () => {
      expect(setup().selection()).toEqual([])
    })

    it('select replaces the selection', () => {
      const { actions, selection, rootId } = setup()
      const a = actions.addNode(rootId, 'Frame')
      const b = actions.addNode(rootId, 'Frame')
      actions.select(a)
      actions.select(b)
      expect(selection()).toEqual([b])
    })

    it('additive select adds, and removes if already selected', () => {
      const { actions, selection, rootId } = setup()
      const a = actions.addNode(rootId, 'Frame')
      const b = actions.addNode(rootId, 'Frame')
      actions.select(a)
      actions.select(b, true)
      expect(selection()).toEqual([a, b])
      actions.select(a, true)
      expect(selection()).toEqual([b])
    })

    it('setSelection replaces it, dropping repeats', () => {
      const { actions, selection, rootId } = setup()
      const a = actions.addNode(rootId, 'Frame')
      const b = actions.addNode(rootId, 'Frame')
      actions.select(a)
      actions.setSelection([b, a, b])
      expect(selection()).toEqual([b, a])
      actions.setSelection([])
      expect(selection()).toEqual([])
    })

    it('setSelection refuses the root and unknown ids', () => {
      const { actions, selection, rootId } = setup()
      const a = actions.addNode(rootId, 'Frame')
      actions.select(a)
      expect(() => actions.setSelection([rootId])).toThrow('root')
      expect(() => actions.setSelection(['nope'])).toThrow('No node')
      expect(selection()).toEqual([a])
    })

    it('clearSelection empties it', () => {
      const { actions, selection, rootId } = setup()
      actions.select(actions.addNode(rootId, 'Frame'))
      actions.clearSelection()
      expect(selection()).toEqual([])
    })

    it('refuses the root and unknown ids', () => {
      const { actions, rootId } = setup()
      expect(() => actions.select(rootId)).toThrow('root')
      expect(() => actions.select('nope')).toThrow('No node')
    })

    it('deleting a node also unselects it and its children', () => {
      const { actions, selection, rootId } = setup()
      const keep = actions.addNode(rootId, 'Frame')
      const parent = actions.addNode(rootId, 'Frame')
      const child = actions.addNode(parent, 'Frame')
      actions.select(keep)
      actions.select(child, true)

      actions.deleteNode(parent)
      expect(selection()).toEqual([keep])
    })

    it('loadDocument clears it', () => {
      const { actions, selection, rootId } = setup()
      actions.select(actions.addNode(rootId, 'Frame'))
      actions.loadDocument(createDocumentStore().getState().document)
      expect(selection()).toEqual([])
    })
  })

  describe('undo and redo', () => {
    it('undo reverts the last edit, redo puts it back', () => {
      const { actions, doc, rootId } = setup()
      const id = actions.addNode(rootId, 'Frame')
      actions.renameNode(id, 'Window')

      actions.undo()
      expect(doc().nodes[id].name).toBe('Frame')
      actions.undo()
      expect(doc().nodes[id]).toBeUndefined()

      actions.redo()
      actions.redo()
      expect(doc().nodes[id].name).toBe('Window')
      expectConsistent(doc())
    })

    it('undo and redo do nothing when there is nothing to do', () => {
      const { actions, doc } = setup()
      const before = doc()
      actions.undo()
      actions.redo()
      expect(doc()).toBe(before)
    })

    it('a new edit after undo clears redo', () => {
      const { actions, doc, rootId } = setup()
      const id = actions.addNode(rootId, 'Frame')
      actions.renameNode(id, 'A')
      actions.undo()
      actions.renameNode(id, 'B')

      actions.redo() // nothing to redo: 'A' is gone for good
      expect(doc().nodes[id].name).toBe('B')
    })

    it('skips edits that change nothing', () => {
      const { actions, doc, rootId } = setup()
      const id = actions.addNode(rootId, 'TextLabel', { TextSize: 20 })
      actions.renameNode(id, 'TextLabel') // same name
      actions.updateProps(id, { TextSize: 20 }) // same value

      actions.undo() // undoes the addNode, not a no-op
      expect(doc().nodes[id]).toBeUndefined()
    })

    it('a failed edit saves no undo step', () => {
      const { actions, doc, rootId } = setup()
      const id = actions.addNode(rootId, 'Frame')
      expect(() => actions.deleteNode(rootId)).toThrow()

      actions.undo() // undoes the addNode
      expect(doc().nodes[id]).toBeUndefined()
    })

    it('a group of edits is undone in one step', () => {
      const { actions, doc, rootId } = setup()
      const id = actions.addNode(rootId, 'Frame')

      actions.beginGroup()
      for (let x = 1; x <= 5; x++) {
        actions.updateProps(id, { Position: { xs: 0, xo: x, ys: 0, yo: 0 } })
      }
      actions.endGroup()
      expect(doc().nodes[id].props.Position?.xo).toBe(5)

      actions.undo()
      expect(doc().nodes[id].props.Position).toBeUndefined()
      actions.redo()
      expect(doc().nodes[id].props.Position?.xo).toBe(5)
    })

    it('a group that changed nothing saves no step', () => {
      const { actions, doc, rootId } = setup()
      const id = actions.addNode(rootId, 'Frame')
      actions.beginGroup()
      actions.endGroup()

      actions.undo() // undoes the addNode
      expect(doc().nodes[id]).toBeUndefined()
    })

    it('unselects elements that undo removes', () => {
      const { actions, selection, rootId } = setup()
      const id = actions.addNode(rootId, 'Frame')
      actions.select(id)
      actions.undo()
      expect(selection()).toEqual([])
    })

    it('selecting is not an undo step', () => {
      const { actions, doc, rootId } = setup()
      const id = actions.addNode(rootId, 'Frame')
      actions.select(id)
      actions.clearSelection()

      actions.undo() // undoes the addNode
      expect(doc().nodes[id]).toBeUndefined()
    })

    it('loadDocument clears the history', () => {
      const { actions, doc, rootId } = setup()
      actions.addNode(rootId, 'Frame')
      const fresh = createDocumentStore().getState().document
      actions.loadDocument(fresh)

      actions.undo()
      expect(doc()).toBe(fresh)
    })
  })
})
