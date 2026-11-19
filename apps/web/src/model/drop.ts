import { isContainerClass } from './classes.ts'
import { isInside } from './tree.ts'
import type { NodeId, UiDocument } from './types.ts'

// Rules for dragging rows in the Explorer. Plain functions, no React.

// Where a dragged row lands, relative to the row it's dropped on:
// just above it, just below it, or inside it as its last child.
export type DropPlace = 'before' | 'after' | 'inside'

// Which place a pointer means, from how far down the row it is
// (`fraction`: 0 = top edge, 1 = bottom edge).
// A row that can hold children splits into three bands: top quarter
// "before", middle half "inside", bottom quarter "after". Any other row
// splits in two, because dropping inside it isn't allowed.
export function dropPlaceAt(
  fraction: number,
  canHoldChildren: boolean,
): DropPlace {
  if (!canHoldChildren) return fraction < 0.5 ? 'before' : 'after'
  if (fraction < 0.25) return 'before'
  if (fraction > 0.75) return 'after'
  return 'inside'
}

// True if the row `targetId` can hold dropped children: the ScreenGui, or a
// container class (the same rule the Insert palette uses).
export function canHoldChildren(doc: UiDocument, targetId: NodeId): boolean {
  const target = doc.nodes[targetId]
  if (!target) return false
  return target.parentId === null || isContainerClass(target.className)
}

// True if dropping `ids` at `place` next to (or into) `targetId` is allowed.
export function canDrop(
  doc: UiDocument,
  ids: NodeId[],
  targetId: NodeId,
  place: DropPlace,
): boolean {
  const target = doc.nodes[targetId]
  if (!target || ids.length === 0) return false

  if (place === 'inside') {
    if (!canHoldChildren(doc, targetId)) return false
  } else {
    // Nothing goes beside the ScreenGui: it's the only top-level thing.
    if (target.parentId === null) return false
    // Dropping a row right above or below itself means nothing.
    if (ids.includes(targetId)) return false
  }

  // The parent the rows would end up in can't be one of them, or inside one
  // of them: an element can't go inside itself.
  const newParentId = place === 'inside' ? targetId : target.parentId!
  return !ids.some((id) => isInside(doc, newParentId, id))
}
