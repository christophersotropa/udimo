import { isContainerClass } from './classes.ts'
import { defaultProps, resolveProps } from './defaults.ts'
import type { ClassName, NodeId, Props, UDim2, UiDocument } from './types.ts'

// How far each new element is shifted when one is already sitting exactly
// where it would go, so repeated inserts don't hide each other.
const CASCADE_STEP = 20

// Which element a new one should go inside:
//  - nothing selected, or several: the ScreenGui
//  - a container (Frame, ScrollingFrame) selected: inside it
//  - anything else selected: next to it, in the same parent
export function insertParent(doc: UiDocument, selection: NodeId[]): NodeId {
  if (selection.length !== 1) return doc.rootId
  const selected = doc.nodes[selection[0]]
  if (!selected) return doc.rootId
  if (isContainerClass(selected.className)) return selected.id
  return selected.parentId ?? doc.rootId
}

function samePosition(a: UDim2, b: UDim2): boolean {
  return a.xs === b.xs && a.xo === b.xo && a.ys === b.ys && a.yo === b.yo
}

// Where a new element goes and what it starts with. It's centered in its
// parent using Scale 0.5 minus half its own size, so AnchorPoint stays at
// Roblox's default (0, 0) and nothing hidden changes.
export function planInsert(
  doc: UiDocument,
  selection: NodeId[],
  className: ClassName,
): { parentId: NodeId; props: Props } {
  const parentId = insertParent(doc, selection)
  const size = defaultProps(className).Size

  const siblingPositions = doc.nodes[parentId].children.map(
    (id) => resolveProps(doc.nodes[id]).Position,
  )

  const centered: UDim2 = {
    xs: 0.5,
    xo: -size.xo / 2,
    ys: 0.5,
    yo: -size.yo / 2,
  }
  const shift = cascadeShift(siblingPositions, [centered])
  const position = shiftBy(centered, shift)

  return { parentId, props: { Size: size, Position: position } }
}

function shiftBy(position: UDim2, shift: number): UDim2 {
  return { ...position, xo: position.xo + shift, yo: position.yo + shift }
}

// How many pixels (down and right) to shift new elements at `positions` so
// none lands exactly on a position already `taken` by a sibling. Steps of 20
// until it's clear; 0 if they're already clear. Used by Insert and Paste.
export function cascadeShift(taken: UDim2[], positions: UDim2[]): number {
  let shift = 0
  const clashes = () =>
    positions.some((p) => taken.some((t) => samePosition(t, shiftBy(p, shift))))
  while (clashes()) shift += CASCADE_STEP
  return shift
}
