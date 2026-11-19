import { resolveProps } from './defaults.ts'
import type { ScreenSize } from './screen.ts'
import type { NodeId, UiDocument, UiNode } from './types.ts'

// Turning UDim2 values into real pixels, the same way Roblox (and the canvas)
// does. Plain TypeScript, no React.

// A rectangle in pixels: top-left corner, then size.
export type Box = { x: number; y: number; width: number; height: number }

// Where an element sits inside a parent of the given pixel size, measured
// from the parent's top-left corner. Each axis is Scale × parent + Offset,
// then AnchorPoint shifts the box so that point lands on Position.
export function boxInParent(node: UiNode, parent: ScreenSize): Box {
  const { Size, Position, AnchorPoint } = resolveProps(node)
  const width = Size.xs * parent.width + Size.xo
  const height = Size.ys * parent.height + Size.yo
  return {
    x: Position.xs * parent.width + Position.xo - AnchorPoint.x * width,
    y: Position.ys * parent.height + Position.yo - AnchorPoint.y * height,
    width,
    height,
  }
}

// An element's box in screen pixels, from the screen's top-left corner.
// It needs its parent's box first, so it climbs up to the ScreenGui.
export function absoluteBox(
  doc: UiDocument,
  id: NodeId,
  screen: ScreenSize,
): Box {
  const node = doc.nodes[id]
  if (node.parentId === null) return { x: 0, y: 0, ...screen }
  const parent = absoluteBox(doc, node.parentId, screen)
  const box = boxInParent(node, parent)
  return { ...box, x: parent.x + box.x, y: parent.y + box.y }
}
