import { resolveProps } from './defaults.ts'
import { absoluteBox, contentArea } from './layout.ts'
import type { ScreenSize } from './screen.ts'
import { topLevelNodes } from './tree.ts'
import type { NodeId, UDim2, UiDocument } from './types.ts'

// "Make responsive": rewrite Position and Size as Scale (a fraction of the
// parent) instead of Offset (pixels), so the UI grows and shrinks with the
// screen. And "use pixels" for the way back. Plain TypeScript, no React.
//
// Either way the element looks exactly the same on the screen you convert
// on: only the units change, so it behaves differently on other screens.

export type Units = 'scale' | 'offset'

// Scale is kept to 4 decimal places: tidy numbers, and less than half a
// pixel out on any screen narrower than 10,000 pixels.
function roundScale(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

// One UDim2 in the other units. `parent` is the size Scale is measured
// against. Each axis: Scale × parent + Offset stays the same.
export function convertUDim2(
  value: UDim2,
  parent: ScreenSize,
  to: Units,
): UDim2 {
  if (to === 'scale') {
    return {
      xs:
        parent.width > 0
          ? roundScale(value.xs + value.xo / parent.width)
          : value.xs,
      xo: parent.width > 0 ? 0 : value.xo,
      ys:
        parent.height > 0
          ? roundScale(value.ys + value.yo / parent.height)
          : value.ys,
      yo: parent.height > 0 ? 0 : value.yo,
    }
  }
  // Roblox offsets are whole pixels.
  return {
    xs: 0,
    xo: Math.round(value.xs * parent.width + value.xo),
    ys: 0,
    yo: Math.round(value.ys * parent.height + value.yo),
  }
}

// The new Position and Size for the elements `ids` and everything inside
// them. Each is measured against its parent's content area on `screen`.
// Converting a parent doesn't change its size on this screen, so every
// element can be worked out from the document as it is now.
export function planUnitConversion(
  doc: UiDocument,
  ids: NodeId[],
  to: Units,
  screen: ScreenSize,
): Map<NodeId, { Position: UDim2; Size: UDim2 }> {
  const plan = new Map<NodeId, { Position: UDim2; Size: UDim2 }>()

  function visit(id: NodeId) {
    const node = doc.nodes[id]
    const parentId = node.parentId!
    const area = contentArea(
      doc.nodes[parentId],
      absoluteBox(doc, parentId, screen),
      doc,
    )
    const { Position, Size } = resolveProps(node)
    plan.set(id, {
      Position: convertUDim2(Position, area, to),
      Size: convertUDim2(Size, area, to),
    })
    for (const childId of node.children) visit(childId)
  }

  // A child selected with its parent is converted once, as part of it.
  for (const id of topLevelNodes(doc, ids)) {
    if (doc.nodes[id]?.parentId) visit(id)
  }
  return plan
}
