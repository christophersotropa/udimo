import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { createId } from '../lib/ids.ts'
import { createEmptyDocument } from '../model/document.ts'
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
  // Adds a new element as the last child of `parentId` and returns its id.
  addNode: (
    parentId: NodeId,
    className: ElementClassName,
    props?: Props,
  ) => NodeId
  renameNode: (id: NodeId, name: string) => void
  // Merges `props` into the node's props. A value of `undefined` removes
  // that property, so it goes back to Roblox's default.
  updateProps: (id: NodeId, props: Props) => void
  // Moves a node under `newParentId` at position `index` (default: last).
  moveNode: (id: NodeId, newParentId: NodeId, index?: number) => void
  // Deletes a node and everything inside it.
  deleteNode: (id: NodeId) => void
}

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

// True if `id` is `ancestorId` itself or sits anywhere inside it.
function isInside(doc: UiDocument, id: NodeId, ancestorId: NodeId): boolean {
  let current: NodeId | null = id
  while (current !== null) {
    if (current === ancestorId) return true
    current = getNode(doc, current).parentId
  }
  return false
}

function removeFromParent(doc: UiDocument, node: UiNode) {
  if (node.parentId === null) return
  const parent = getNode(doc, node.parentId)
  parent.children = parent.children.filter((childId) => childId !== node.id)
}

// ---------- The store ----------

// A function that builds a fresh store, so each test can start from a clean one.
export function createDocumentStore(
  initialDocument: UiDocument = createEmptyDocument(),
) {
  return create<DocumentState>()(
    immer((set) => ({
      document: initialDocument,

      addNode: (parentId, className, props = {}) => {
        const id = createId()
        set((state) => {
          const doc = state.document
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
        set((state) => {
          getNode(state.document, id).name = name
        })
      },

      updateProps: (id, props) => {
        set((state) => {
          const node = getNode(state.document, id)
          const merged = { ...node.props, ...props }
          for (const key of Object.keys(merged) as (keyof Props)[]) {
            if (merged[key] === undefined) delete merged[key]
          }
          node.props = merged
        })
      },

      moveNode: (id, newParentId, index) => {
        set((state) => {
          const doc = state.document
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
        set((state) => {
          const doc = state.document
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
    })),
  )
}

// The one store the editor uses. In React: useDocumentStore((s) => s.document)
export const useDocumentStore = createDocumentStore()
