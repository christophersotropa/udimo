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

// The size of the area an element's children are laid out in. Usually the
// element itself. A ScrollingFrame's children sit on its scrollable canvas
// instead: CanvasSize big (Scale meaning a fraction of the frame), but never
// smaller than the frame.
export function contentSize(node: UiNode, size: ScreenSize): ScreenSize {
  if (node.className !== 'ScrollingFrame') return size
  const { CanvasSize } = resolveProps(node)
  return {
    width: Math.max(size.width, CanvasSize.xs * size.width + CanvasSize.xo),
    height: Math.max(size.height, CanvasSize.ys * size.height + CanvasSize.yo),
  }
}

// An element's box in screen pixels, from the screen's top-left corner.
// It needs its parent's box first, so it climbs up to the ScreenGui.
// (A ScrollingFrame is assumed scrolled to the top, as it starts in game.)
export function absoluteBox(
  doc: UiDocument,
  id: NodeId,
  screen: ScreenSize,
): Box {
  const node = doc.nodes[id]
  if (node.parentId === null) return { x: 0, y: 0, ...screen }
  const parent = absoluteBox(doc, node.parentId, screen)
  const area = contentSize(doc.nodes[node.parentId], parent)
  const box = boxInParent(node, area)
  return { ...box, x: parent.x + box.x, y: parent.y + box.y }
}

// How much of a ScrollingFrame's canvas fits in view along one axis, from 0
// to 1 (1: all of it, so no scrolling). The scroll bar's length on the canvas.
export function visibleFraction(
  doc: UiDocument,
  id: NodeId,
  screen: ScreenSize,
  axis: 'x' | 'y',
): number {
  const box = absoluteBox(doc, id, screen)
  const canvas = contentSize(doc.nodes[id], box)
  const [visible, total] =
    axis === 'x' ? [box.width, canvas.width] : [box.height, canvas.height]
  return total > 0 ? visible / total : 1
}
