import { produce } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { createId } from '../lib/ids.ts'
import { createEmptyDocument } from '../model/document.ts'
import { isInside } from '../model/tree.ts'
import type {
  ClassName,
  NodeId,
  Props,
  UiDocument,
  UiNode,
} from '../model/types.ts'

// Any class except ScreenGui: the ScreenGui is always the root, and there is only one.
export type ElementClassName = Exclude<ClassName, 'ScreenGui'>

export type DocumentState = {
  document: UiDocument
  // Ids of the selected elements, in the order they were selected. This is
  // editor state, not part of the document: it's never exported or undone.
  selection: NodeId[]
  // Undo history: earlier versions of the document (newest last), and the
  // versions you've undone, ready for redo (newest last).
  past: UiDocument[]
  future: UiDocument[]

  // Selects one element. With `additive` (Shift-click) it's added to the
  // selection instead, or removed if it was already selected.
  select: (id: NodeId, additive?: boolean) => void
  clearSelection: () => void

  undo: () => void
  redo: () => void
  // Everything between beginGroup() and endGroup() becomes one undo step,
  // e.g. all the small moves of one drag, or all the keystrokes in one box.
  beginGroup: () => void
  endGroup: () => void

  // Replaces the whole document, e.g. when opening a project file.
  // Also clears the undo history.
  loadDocument: (document: UiDocument) => void
  // Adds a new element as the last child of `parentId` and returns its id.
  addNode: (
    parentId: NodeId,
    className: ElementClassName,
    props?: Props,
  ) => NodeId
  renameNode: (id: NodeId, name: string) => void
  // Locks or unlocks an element on the canvas (see UiNode.locked).
  setLocked: (id: NodeId, locked: boolean) => void
  // Merges `props` into the node's props. A value of `undefined` removes
  // that property, so it goes back to Roblox's default.
  updateProps: (id: NodeId, props: Props) => void
  // Moves a node under `newParentId` at position `index` (default: last).
  moveNode: (id: NodeId, newParentId: NodeId, index?: number) => void
  // Deletes a node and everything inside it.
  deleteNode: (id: NodeId) => void
}

// How many undo steps to keep. Old versions share every unchanged node with
// newer ones (Immer's structural sharing), so each step costs little memory.
const HISTORY_LIMIT = 200

// ---------- Helpers ----------
// Every action checks its input and throws on a mistake. Inside Immer, a throw
// cancels the whole change, so the document is never left half-edited.

function getNode(doc: UiDocument, id: NodeId): UiNode {
  const node = doc.nodes[id]
  if (!node) throw new Error(`No node with id "${id}"`)
  return node
}

function assertNotRoot(doc: UiDocument, id: NodeId, action: string) {
  if (id === doc.rootId) throw new Error(`Cannot ${action} the root ScreenGui`)
}

function removeFromParent(doc: UiDocument, node: UiNode) {
  if (node.parentId === null) return
  const parent = getNode(doc, node.parentId)
  parent.children = parent.children.filter((childId) => childId !== node.id)
}

// Drops selected ids that no longer exist (after a delete, undo or redo).
function keepExistingSelection(state: DocumentState) {
  state.selection = state.selection.filter((id) => state.document.nodes[id])
}

// Saves `before` as an undo step. A new edit makes the redo list meaningless.
function pushHistory(state: DocumentState, before: UiDocument) {
  state.past.push(before)
  if (state.past.length > HISTORY_LIMIT) state.past.shift()
  state.future = []
}

// ---------- The store ----------

// A function that builds a fresh store, so each test can start from a clean one.
export function createDocumentStore(
  initialDocument: UiDocument = createEmptyDocument(),
) {
  // The document when the current group began, or null when not grouping.
  // It lives outside the store state because nothing on screen shows it.
  let groupStart: UiDocument | null = null

  return create<DocumentState>()(
    immer((set, get) => {
      // Every document edit goes through here. Immer's produce() makes the
      // new version; if nothing actually changed it hands back the same
      // object, and we skip saving an undo step that would do nothing.
      function change(recipe: (doc: UiDocument) => void) {
        const before = get().document
        const after = produce(before, recipe)
        if (after === before) return

        set((state) => {
          state.document = after
          if (groupStart === null) pushHistory(state, before)
          keepExistingSelection(state)
        })
      }

      return {
        document: initialDocument,
        selection: [],
        past: [],
        future: [],

        select: (id, additive = false) => {
          set((state) => {
            getNode(state.document, id) // throws if the id doesn't exist
            assertNotRoot(state.document, id, 'select')
            if (!additive) {
              state.selection = [id]
            } else if (state.selection.includes(id)) {
              state.selection = state.selection.filter((other) => other !== id)
            } else {
              state.selection.push(id)
            }
          })
        },

        clearSelection: () => {
          set((state) => {
            state.selection = []
          })
        },

        undo: () => {
          get().endGroup() // finish anything half-grouped first
          set((state) => {
            const previous = state.past.pop()
            if (!previous) return
            state.future.push(state.document)
            state.document = previous
            keepExistingSelection(state)
          })
        },

        redo: () => {
          get().endGroup()
          set((state) => {
            const next = state.future.pop()
            if (!next) return
            state.past.push(state.document)
            state.document = next
            keepExistingSelection(state)
          })
        },

        beginGroup: () => {
          if (groupStart === null) groupStart = get().document
        },

        endGroup: () => {
          const start = groupStart
          if (start === null) return
          groupStart = null
          // Only save a step if the group actually changed something.
          if (get().document !== start) {
            set((state) => pushHistory(state, start))
          }
        },

        loadDocument: (document) => {
          groupStart = null
          set((state) => {
            state.document = document
            state.selection = [] // old ids mean nothing in the new document
            state.past = []
            state.future = []
          })
        },

        addNode: (parentId, className, props = {}) => {
          const id = createId()
          change((doc) => {
            const parent = getNode(doc, parentId)
            doc.nodes[id] = {
              id,
              className,
              name: className, // Roblox also names new instances after their class
              parentId,
              children: [],
              props: { ...props },
            }
            parent.children.push(id)
          })
          return id
        },

        renameNode: (id, name) => {
          change((doc) => {
            getNode(doc, id).name = name
          })
        },

        setLocked: (id, locked) => {
          change((doc) => {
            const node = getNode(doc, id)
            // Unlocked is the normal state, so unlocking removes the field
            // instead of storing `false`.
            if (locked) node.locked = true
            else delete node.locked
          })
        },

        updateProps: (id, props) => {
          change((doc) => {
            const node = getNode(doc, id)
            for (const key of Object.keys(props) as (keyof Props)[]) {
              const value = props[key]
              if (value === undefined) {
                delete node.props[key]
              } else {
                // Copying key by key (instead of replacing the whole props
                // object) lets Immer spot when nothing really changed.
                Object.assign(node.props, { [key]: value })
              }
            }
          })
        },

        moveNode: (id, newParentId, index) => {
          change((doc) => {
            assertNotRoot(doc, id, 'move')
            const node = getNode(doc, id)
            const newParent = getNode(doc, newParentId)
            if (isInside(doc, newParentId, id)) {
              throw new Error(
                'Cannot move a node into itself or its own children',
              )
            }

            removeFromParent(doc, node)
            const at = index ?? newParent.children.length
            newParent.children.splice(at, 0, id)
            node.parentId = newParentId
          })
        },

        deleteNode: (id) => {
          change((doc) => {
            assertNotRoot(doc, id, 'delete')
            const node = getNode(doc, id)
            removeFromParent(doc, node)

            // Delete the node, then its children, their children, and so on.
            const toDelete = [id]
            while (toDelete.length > 0) {
              const current = getNode(doc, toDelete.pop()!)
              toDelete.push(...current.children)
              delete doc.nodes[current.id]
            }
          })
        },
      }
    }),
  )
}

// The type of a store built by createDocumentStore, for functions that take one.
export type DocumentStore = ReturnType<typeof createDocumentStore>

// The one store the editor uses. In React: useDocumentStore((s) => s.document)
export const useDocumentStore = createDocumentStore()
