import { arrangeGrid, arrangeList, type LayoutItem } from './arrange.ts'
import { resolveProps } from './defaults.ts'
import { resolveModifier } from './modifiers.ts'
import type { ScreenSize } from './screen.ts'
import type { NodeId, UDim, UiDocument, UiNode } from './types.ts'

// Turning UDim2 values into real pixels, the same way Roblox (and the canvas)
// does. Plain TypeScript, no React.

// A rectangle in pixels: top-left corner, then size.
export type Box = { x: number; y: number; width: number; height: number }

// Scale × length + Offset: one UDim in pixels.
function udimPixels(value: UDim, length: number): number {
  return value.s * length + value.o
}

// The biggest box with this width:height ratio that fits inside
// width × height. This is UIAspectRatioConstraint's default mode
// (AspectType FitWithinMaxSize).
export function fitAspect(
  width: number,
  height: number,
  ratio: number,
): ScreenSize {
  if (ratio <= 0 || height <= 0) return { width, height }
  return width / height > ratio
    ? { width: height * ratio, height }
    : { width, height: width / ratio }
}

// Where an element sits inside a parent area of the given pixel size,
// measured from the area's top-left corner. Each axis is Scale × parent +
// Offset; a UIAspectRatioConstraint then shrinks the box to its shape; then
// AnchorPoint shifts the box so that point lands on Position.
export function boxInParent(node: UiNode, parent: ScreenSize): Box {
  const { Size, Position, AnchorPoint } = resolveProps(node)
  let width = Size.xs * parent.width + Size.xo
  let height = Size.ys * parent.height + Size.yo

  const aspect = resolveModifier(node, 'UIAspectRatioConstraint')
  if (aspect) ({ width, height } = fitAspect(width, height, aspect.AspectRatio))

  return {
    x: Position.xs * parent.width + Position.xo - AnchorPoint.x * width,
    y: Position.ys * parent.height + Position.yo - AnchorPoint.y * height,
    width,
    height,
  }
}

// A ScrollingFrame's scrollable canvas: CanvasSize big (Scale meaning a
// fraction of the frame), but never smaller than the frame. Any other
// element just has its own size.
export function canvasSize(node: UiNode, size: ScreenSize): ScreenSize {
  if (node.className !== 'ScrollingFrame') return size
  const { CanvasSize } = resolveProps(node)
  return {
    width: Math.max(size.width, CanvasSize.xs * size.width + CanvasSize.xo),
    height: Math.max(size.height, CanvasSize.ys * size.height + CanvasSize.yo),
  }
}

// The area an element's children are laid out in, measured from the
// element's top-left corner: its canvas (see canvasSize), minus any
// UIPadding. Children's Scale is a fraction of this area, and their
// Position starts at its corner.
export function contentArea(node: UiNode, size: ScreenSize): Box {
  const { width, height } = canvasSize(node, size)
  const padding = resolveModifier(node, 'UIPadding')
  if (!padding) return { x: 0, y: 0, width, height }

  const left = udimPixels(padding.PaddingLeft, width)
  const right = udimPixels(padding.PaddingRight, width)
  const top = udimPixels(padding.PaddingTop, height)
  const bottom = udimPixels(padding.PaddingBottom, height)
  return {
    x: left,
    y: top,
    width: Math.max(0, width - left - right),
    height: Math.max(0, height - top - bottom),
  }
}

// True if `id`'s parent has a layout that places it: the parent has a
// UIListLayout or UIGridLayout, and the element is visible (layouts skip
// hidden children, leaving no gap). Its Position is then ignored.
export function isLaidOut(doc: UiDocument, id: NodeId): boolean {
  const node = doc.nodes[id]
  if (!node || node.parentId === null) return false
  const parent = doc.nodes[node.parentId]
  const hasLayout = Boolean(
    parent.modifiers?.UIListLayout || parent.modifiers?.UIGridLayout,
  )
  return hasLayout && resolveProps(node).Visible
}

// Where a parent's layout puts each of its children, measured from the
// corner of its content area (of size `area`), or null if it has no layout.
export function layoutBoxes(
  doc: UiDocument,
  parentId: NodeId,
  area: ScreenSize,
): Map<NodeId, Box> | null {
  const parent = doc.nodes[parentId]
  const list = resolveModifier(parent, 'UIListLayout')
  const grid = resolveModifier(parent, 'UIGridLayout')
  if (!list && !grid) return null

  const items: LayoutItem[] = parent.children
    .filter((childId) => isLaidOut(doc, childId))
    .map((childId) => {
      const child = doc.nodes[childId]
      const { width, height } = boxInParent(child, area)
      return {
        id: childId,
        name: child.name,
        layoutOrder: resolveProps(child).LayoutOrder,
        width,
        height,
      }
    })
  return list ? arrangeList(items, area, list) : arrangeGrid(items, area, grid!)
}

// Where an element sits inside its parent's content area: placed by the
// parent's layout if it has one, otherwise by its own Position and Size.
function boxInContentArea(
  doc: UiDocument,
  node: UiNode,
  area: ScreenSize,
): Box {
  const placed = isLaidOut(doc, node.id)
    ? layoutBoxes(doc, node.parentId!, area)?.get(node.id)
    : undefined
  return placed ?? boxInParent(node, area)
}

// The box a layout gives an element, measured from the corner of its
// parent's content area, or null if no layout places it. The canvas uses it
// to draw laid-out children in pixels.
export function layoutSlot(
  doc: UiDocument,
  id: NodeId,
  screen: ScreenSize,
): Box | null {
  if (!isLaidOut(doc, id)) return null
  const parentId = doc.nodes[id].parentId!
  const parentBox = absoluteBox(doc, parentId, screen)
  const area = contentArea(doc.nodes[parentId], parentBox)
  return layoutBoxes(doc, parentId, area)?.get(id) ?? null
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
  const area = contentArea(doc.nodes[node.parentId], parent)
  const box = boxInContentArea(doc, node, area)
  return {
    ...box,
    x: parent.x + area.x + box.x,
    y: parent.y + area.y + box.y,
  }
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
  const canvas = canvasSize(doc.nodes[id], box)
  const [visible, total] =
    axis === 'x' ? [box.width, canvas.width] : [box.height, canvas.height]
  return total > 0 ? visible / total : 1
}

// An element's corner radius in pixels (0 without a UICorner). Scale is a
// fraction of the element's shorter side, and like Roblox the radius never
// goes past half that side, which makes a perfect pill or circle.
export function cornerRadiusPixels(
  doc: UiDocument,
  id: NodeId,
  screen: ScreenSize,
): number {
  const corner = resolveModifier(doc.nodes[id], 'UICorner')
  if (!corner) return 0
  const box = absoluteBox(doc, id, screen)
  const shorter = Math.max(0, Math.min(box.width, box.height))
  const radius = udimPixels(corner.CornerRadius, shorter)
  return Math.min(Math.max(0, radius), shorter / 2)
}
