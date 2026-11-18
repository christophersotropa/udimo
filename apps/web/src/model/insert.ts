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

  let position: UDim2 = {
    xs: 0.5,
    xo: -size.xo / 2,
    ys: 0.5,
    yo: -size.yo / 2,
  }
  // Step down and right while a sibling already sits exactly there.
  while (siblingPositions.some((p) => samePosition(p, position))) {
    position = {
      ...position,
      xo: position.xo + CASCADE_STEP,
      yo: position.yo + CASCADE_STEP,
    }
  }

  return { parentId, props: { Size: size, Position: position } }
}
