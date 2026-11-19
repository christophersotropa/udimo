import { addOffset } from '../lib/udim2.ts'
import { resolveProps } from '../model/defaults.ts'
import { canDrop, type DropPlace } from '../model/drop.ts'
import { inTreeOrder, topLevelNodes } from '../model/tree.ts'
import type { NodeId, UiDocument } from '../model/types.ts'
import type { DocumentStore, ElementClassName } from './documentStore.ts'

// Editor commands: actions on "whatever is selected" that may take several
// store calls. Each takes the store as an argument, so tests can run them on
// a fresh store. Each one is a single undo step.

// How far a duplicate is shifted from its original, so you can see it.
const DUPLICATE_OFFSET = 20

// Runs `work` as one undo step. `finally` makes sure the group ends even if
// something throws halfway, so later edits don't get swallowed into it.
function asOneStep(store: DocumentStore, work: () => void) {
  store.getState().beginGroup()
  try {
    work()
  } finally {
    store.getState().endGroup()
  }
}

// The selected elements, minus any that sit inside another selected one.
// Deleting or moving the parent already covers its children.
function selectedTopLevel(store: DocumentStore): NodeId[] {
  const { document, selection } = store.getState()
  return topLevelNodes(document, selection)
}

export function deleteSelection(store: DocumentStore) {
  const ids = selectedTopLevel(store)
  if (ids.length === 0) return
  asOneStep(store, () => {
    for (const id of ids) store.getState().deleteNode(id)
  })
}

// Moves each selected element by (dx, dy) pixels of Offset.
export function nudgeSelection(store: DocumentStore, dx: number, dy: number) {
  const ids = selectedTopLevel(store)
  if (ids.length === 0) return
  asOneStep(store, () => {
    const { document, updateProps } = store.getState()
    for (const id of ids) {
      const position = resolveProps(document.nodes[id]).Position
      updateProps(id, { Position: addOffset(position, dx, dy) })
    }
  })
}

// Hides or shows one element. Hiding sets Visible = false: a real Roblox
// property, so the element is hidden in the exported file too (handy for a
// window that a script opens later). Visible is true by default, so showing
// removes the property instead of writing `true`.
export function toggleVisible(store: DocumentStore, id: NodeId) {
  const { document, updateProps } = store.getState()
  const visible = resolveProps(document.nodes[id]).Visible
  updateProps(id, { Visible: visible ? false : undefined })
}

export function toggleLocked(store: DocumentStore, id: NodeId) {
  const { document, setLocked } = store.getState()
  setLocked(id, !document.nodes[id].locked)
}

// Copies a node and everything inside it under `parentId`, with new ids.
// It reads from `sourceDoc`, a snapshot taken before copying began, so the
// copies it makes along the way can never be copied again.
function copySubtree(
  store: DocumentStore,
  sourceDoc: UiDocument,
  sourceId: NodeId,
  parentId: NodeId,
): NodeId {
  const source = sourceDoc.nodes[sourceId]
  const { addNode, renameNode } = store.getState()
  // Only the root is a ScreenGui, and the root is never copied.
  const copyId = addNode(
    parentId,
    source.className as ElementClassName,
    source.props,
  )
  renameNode(copyId, source.name) // Roblox keeps the name on a duplicate
  for (const childId of source.children) {
    copySubtree(store, sourceDoc, childId, copyId)
  }
  return copyId
}

// Duplicates each selected element (with its children) right after the
// original, shifted a little, then selects the copies.
export function duplicateSelection(store: DocumentStore) {
  const ids = selectedTopLevel(store)
  if (ids.length === 0) return
  const sourceDoc = store.getState().document

  asOneStep(store, () => {
    const copies = ids.map((id) => {
      const original = sourceDoc.nodes[id]
      const parentId = original.parentId!
      const copyId = copySubtree(store, sourceDoc, id, parentId)

      // addNode put the copy last; move it to just after the original,
      // so it sits next to it in the Explorer and draws just above it.
      const { document, moveNode, updateProps } = store.getState()
      const index = document.nodes[parentId].children.indexOf(id) + 1
      moveNode(copyId, parentId, index)

      const position = resolveProps(original).Position
      updateProps(copyId, {
        Position: addOffset(position, DUPLICATE_OFFSET, DUPLICATE_OFFSET),
      })
      return copyId
    })

    const { select } = store.getState()
    copies.forEach((copyId, i) => select(copyId, i > 0))
  })
}

// Moves elements next to, or into, the element `targetId` (an Explorer drop).
// They keep their order from the tree. Returns false, and changes nothing,
// if the drop isn't allowed. Like Roblox Studio, Position and Size keep their
// values, so an element can jump on screen when its parent changes.
export function moveNodesTo(
  store: DocumentStore,
  ids: NodeId[],
  targetId: NodeId,
  place: DropPlace,
): boolean {
  const doc = store.getState().document
  if (!canDrop(doc, ids, targetId, place)) return false
  // Dragging a Frame and its child together: only the Frame moves.
  const moving = inTreeOrder(doc, topLevelNodes(doc, ids))

  asOneStep(store, () => {
    const { moveNode } = store.getState()
    if (place === 'inside') {
      for (const id of moving) moveNode(id, targetId) // each goes last
      return
    }

    const parentId = doc.nodes[targetId].parentId!
    // Each element goes before the target, or after the one placed before it.
    let anchor = targetId
    for (const id of moving) {
      // moveNode takes the element out before putting it back in, so count
      // positions without it.
      const siblings = store
        .getState()
        .document.nodes[parentId].children.filter((child) => child !== id)
      const index = siblings.indexOf(anchor) + (place === 'after' ? 1 : 0)
      moveNode(id, parentId, index)
      if (place === 'after') anchor = id
    }
  })
  return true
}
