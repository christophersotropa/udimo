import { addOffset } from '../lib/udim2.ts'
import { resolveProps } from '../model/defaults.ts'
import { canDrop, type DropPlace } from '../model/drop.ts'
import { extractSubtrees, pasteParent } from '../model/fragment.ts'
import type { CatalogEntry } from '../model/catalog.ts'
import { cascadeShift, planInsert } from '../model/insert.ts'
import { isLaidOut } from '../model/layout.ts'
import { SCREEN, type ScreenSize } from '../model/screen.ts'
import { inTreeOrder, topLevelNodes } from '../model/tree.ts'
import { planUnitConversion, type Units } from '../model/responsive.ts'
import { planWrap } from '../model/wrap.ts'
import { MODIFIER_CLASSES } from '../model/modifiers.ts'
import type { NodeId, UiDocument, UiNode } from '../model/types.ts'
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

// Moves each selected element by (dx, dy) pixels of Offset. Elements a
// layout places are skipped.
export function nudgeSelection(store: DocumentStore, dx: number, dy: number) {
  const ids = selectedTopLevel(store)
  if (ids.length === 0) return
  asOneStep(store, () => {
    const { document, updateProps } = store.getState()
    for (const id of ids) {
      if (isLaidOut(document, id)) continue // a layout ignores Position
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

// Gives the element `targetId` the same modifiers as `source`.
function copyModifiers(store: DocumentStore, source: UiNode, targetId: NodeId) {
  const { addModifier, updateModifier } = store.getState()
  for (const modifier of MODIFIER_CLASSES) {
    const props = source.modifiers?.[modifier]
    if (!props) continue
    addModifier(targetId, modifier)
    updateModifier(targetId, modifier, props)
  }
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
  copyModifiers(store, source, copyId)
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

// ---------- Copy, cut, paste ----------

// The selected elements (with everything inside them) as a fragment, ready
// to keep on a clipboard. null if nothing is selected. Changes nothing.
export function copySelection(store: DocumentStore): UiDocument | null {
  const ids = selectedTopLevel(store)
  if (ids.length === 0) return null
  return extractSubtrees(store.getState().document, ids)
}

// Copy, then delete what was copied.
export function cutSelection(store: DocumentStore): UiDocument | null {
  const fragment = copySelection(store)
  if (fragment) deleteSelection(store)
  return fragment
}

// Adds copies of a fragment's elements (new ids), selects them, and returns
// their ids. They keep their Position, shifted 20px at a time only if they'd
// land exactly on a sibling (say, pasting right next to the originals).
// `pastedBefore`: what the previous paste returned (see pasteParent).
// `into`: paste inside this element instead ("Paste Into").
export function pasteFragment(
  store: DocumentStore,
  fragment: UiDocument,
  pastedBefore: NodeId[] = [],
  into?: NodeId,
): NodeId[] {
  const tops = fragment.nodes[fragment.rootId].children
  if (tops.length === 0) return []
  const { document, selection } = store.getState()
  const parentId =
    into ?? pasteParent(document, selection, fragment, pastedBefore)

  const positions = tops.map((id) => resolveProps(fragment.nodes[id]).Position)
  const taken = document.nodes[parentId].children.map(
    (id) => resolveProps(document.nodes[id]).Position,
  )
  const shift = cascadeShift(taken, positions)

  let copies: NodeId[] = []
  asOneStep(store, () => {
    copies = tops.map((id, i) => {
      const copyId = copySubtree(store, fragment, id, parentId)
      if (shift !== 0) {
        store.getState().updateProps(copyId, {
          Position: addOffset(positions[i], shift, shift),
        })
      }
      return copyId
    })
    const { select } = store.getState()
    copies.forEach((copyId, i) => select(copyId, i > 0))
  })
  return copies
}

// ---------- Wrap in Frame ----------

// Puts the selected elements inside a new invisible Frame that fits around
// them, without anything moving on screen (see model/wrap.ts), then selects
// the Frame. Returns false, changing nothing, if they can't be wrapped
// (nothing selected, or they have different parents).
export function wrapSelectionInFrame(
  store: DocumentStore,
  screen: ScreenSize = SCREEN,
): boolean {
  const { document, selection } = store.getState()
  const plan = planWrap(document, selection, screen)
  if (!plan) return false

  asOneStep(store, () => {
    const { addNode, moveNode, updateProps, select } = store.getState()
    const frameId = addNode(plan.parentId, 'Frame', plan.frameProps)
    moveNode(frameId, plan.parentId, plan.index)
    for (const child of plan.children) {
      moveNode(child.id, frameId) // each goes last, so the order is kept
      updateProps(child.id, child.props)
    }
    select(frameId)
  })
  return true
}

// ---------- Make responsive ----------

// Converts the Position and Size of the elements `ids`, and everything
// inside them, to Scale ("make responsive") or Offset ("use pixels"), as one
// undo step. They look the same on `screen` afterwards (see
// model/responsive.ts).
export function convertUnits(
  store: DocumentStore,
  ids: NodeId[],
  to: Units,
  screen: ScreenSize = SCREEN,
) {
  const plan = planUnitConversion(store.getState().document, ids, to, screen)
  if (plan.size === 0) return
  asOneStep(store, () => {
    const { updateProps } = store.getState()
    for (const [id, props] of plan) updateProps(id, props)
  })
}

// ---------- Menu actions ----------

// "Insert Object" on the element `targetId` (the ScreenGui for empty
// canvas). An element goes where the Insert rules say: inside a container,
// next to anything else. A modifier goes on the target itself. The new
// element is selected. Returns false if nothing was added (a modifier the
// target already has, or one on the ScreenGui).
export function insertObject(
  store: DocumentStore,
  targetId: NodeId,
  entry: CatalogEntry,
): boolean {
  const { document, addNode, addModifier, select } = store.getState()
  if (entry.kind === 'modifier') {
    const target = document.nodes[targetId]
    if (target.parentId === null || target.modifiers?.[entry.className]) {
      return false
    }
    addModifier(targetId, entry.className)
    return true
  }
  const selection = targetId === document.rootId ? [] : [targetId]
  const { parentId, props } = planInsert(document, selection, entry.className)
  select(addNode(parentId, entry.className, props))
  return true
}

// Shows or hides several elements at once, as one undo step.
export function setVisible(
  store: DocumentStore,
  ids: NodeId[],
  visible: boolean,
) {
  asOneStep(store, () => {
    const { updateProps } = store.getState()
    // Visible is true by default, so showing removes the property.
    for (const id of ids)
      updateProps(id, { Visible: visible ? undefined : false })
  })
}

// Locks or unlocks several elements at once, as one undo step.
export function setLockedAll(
  store: DocumentStore,
  ids: NodeId[],
  locked: boolean,
) {
  asOneStep(store, () => {
    const { setLocked } = store.getState()
    for (const id of ids) setLocked(id, locked)
  })
}

// ---------- Arrange ----------

export type ArrangeMove = 'front' | 'forward' | 'backward' | 'back'

// Moves the selected elements in their parent's list of children, which is
// their drawing order: later children are drawn on top (when their ZIndex
// is the same). "front" is the end of the list, "back" the start; forward
// and backward move one place. One undo step.
export function arrangeSelection(store: DocumentStore, move: ArrangeMove) {
  const ids = selectedTopLevel(store)
  if (ids.length === 0) return
  const doc = store.getState().document
  // Work through them in the order that keeps them in their order among
  // themselves. Jumping all the way (front/back): the one that should end
  // up furthest goes last, so front goes first-to-last, back last-to-first.
  // Stepping one place (forward/backward): the one nearest the end it's
  // heading for goes first, so they don't hop over each other.
  const ordered = inTreeOrder(doc, ids)
  if (move === 'back' || move === 'forward') ordered.reverse()
  asOneStep(store, () => {
    for (const id of ordered) {
      const { document, moveNode } = store.getState()
      const parentId = document.nodes[id].parentId!
      const siblings = document.nodes[parentId].children
      const index = siblings.indexOf(id)
      const last = siblings.length - 1
      const target =
        move === 'front'
          ? last
          : move === 'back'
            ? 0
            : move === 'forward'
              ? Math.min(last, index + 1)
              : Math.max(0, index - 1)
      // moveNode counts positions with the element taken out, which is the
      // same number here, because it's already in this parent.
      if (target !== index) moveNode(id, parentId, target)
    }
  })
}

// Selects every element directly inside the ScreenGui.
export function selectAll(store: DocumentStore) {
  const { document, select, clearSelection } = store.getState()
  clearSelection()
  for (const id of document.nodes[document.rootId].children) select(id, true)
}

// Selects the elements directly inside `id` (not their children). Does
// nothing if it has none.
export function selectChildren(store: DocumentStore, id: NodeId) {
  const { document, select } = store.getState()
  const children = document.nodes[id]?.children ?? []
  children.forEach((childId, i) => select(childId, i > 0))
}
