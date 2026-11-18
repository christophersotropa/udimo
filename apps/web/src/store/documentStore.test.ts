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
})
