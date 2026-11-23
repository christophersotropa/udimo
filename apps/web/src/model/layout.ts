import { richTextPlain } from '../lib/richText.ts'
import { wrappedLineCount } from '../lib/text.ts'
import { arrangeGrid, arrangeList, type LayoutItem } from './arrange.ts'
import { isTextClass } from './classes.ts'
import { resolveProps } from './defaults.ts'
import { resolveModifier } from './modifiers.ts'
import type { AutomaticSize } from './enums.ts'
import type { ScreenSize } from './screen.ts'
import { textMetrics } from './textMetrics.ts'
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

// Keeps a length between a smallest and (unless null: no limit) a largest
// size, the smallest winning if they cross, like CSS min/max sizes.
export function clampSize(length: number, min: number, max: number | null) {
  return Math.max(min, max === null ? length : Math.min(length, max))
}

// Where an element sits inside a parent area of the given pixel size,
// measured from the area's top-left corner. Each axis is Scale × parent +
// Offset; a UIAspectRatioConstraint then shrinks the box to its shape;
// AutomaticSize grows it to fit its contents (given the document, which
// holds its children); a UISizeConstraint keeps it between its MinSize and
// MaxSize; then AnchorPoint shifts the box so that point lands on Position
// (so a growing element grows away from its AnchorPoint).
export function boxInParent(
  node: UiNode,
  parent: ScreenSize,
  doc?: UiDocument,
): Box {
  const { Size, Position, AnchorPoint, AutomaticSize } = resolveProps(node)
  let width = Size.xs * parent.width + Size.xo
  let height = Size.ys * parent.height + Size.yo

  const aspect = resolveModifier(node, 'UIAspectRatioConstraint')
  if (aspect) ({ width, height } = fitAspect(width, height, aspect.AspectRatio))

  if (doc && AutomaticSize !== 'None') {
    ;({ width, height } = grownSize(doc, node, { width, height }))
  }

  const limits = resolveModifier(node, 'UISizeConstraint')
  if (limits) {
    width = clampSize(width, limits.MinSize.x, limits.MaxSize.x)
    height = clampSize(height, limits.MinSize.y, limits.MaxSize.y)
  }

  return {
    x: Position.xs * parent.width + Position.xo - AnchorPoint.x * width,
    y: Position.ys * parent.height + Position.yo - AnchorPoint.y * height,
    width,
    height,
  }
}

// The size of an element's text: its widest line, and its lines' height.
// With `wrapAt`, lines wrap at that width first (TextWrapped). Measured
// with textMetrics (the browser's measurements in the editor).
export function textBounds(node: UiNode, wrapAt: number | null): ScreenSize {
  const p = resolveProps(node)
  const metrics = textMetrics()
  // What's shown: an empty TextBox shows its placeholder; RichText's tags
  // take no room.
  const shown =
    node.className === 'TextBox' && p.Text === '' ? p.PlaceholderText : p.Text
  const lines = (p.RichText ? richTextPlain(shown) : shown).split('\n')
  const widthOf = (text: string) => metrics.width(text, p.FontFace, p.TextSize)
  const lineHeight = p.TextSize * metrics.lineHeight(p.FontFace) * p.LineHeight

  if (wrapAt === null) {
    return {
      width: Math.max(...lines.map(widthOf)),
      height: lines.length * lineHeight,
    }
  }
  let count = 0
  let widest = 0
  for (const line of lines) {
    const words = line.split(' ')
    count += wrappedLineCount(words.map(widthOf), widthOf(' '), wrapAt)
    widest = Math.max(widest, Math.min(wrapAt, widthOf(line)))
  }
  return { width: widest, height: count * lineHeight }
}

// How much room an element's contents need, measured from the corner of
// `surface` (the element itself, or a ScrollingFrame's canvas): its visible
// children where they sit (or where its layout puts them), with `withText`
// its text too (unless TextScaled, which fits the text to the box
// instead), plus its UIPadding. Children sized by Scale are measured
// against `surface`: measured against the grown size, they'd grow with
// whatever grows to fit them, forever. With only Y growing, TextWrapped
// text wraps at the width.
function contentNeeds(
  doc: UiDocument,
  node: UiNode,
  surface: ScreenSize,
  withText: boolean,
): ScreenSize {
  const p = resolveProps(node)
  const area = paddedArea(node, surface)
  // UIPadding on the right and bottom, which the contents also need. Read
  // from the UIPadding itself, not from what's left of the area: an
  // element starting at 0 tall (a list that grows) has no room for its
  // padding yet.
  const padding = resolveModifier(node, 'UIPadding')
  const padRight = padding ? udimPixels(padding.PaddingRight, surface.width) : 0
  const padBottom = padding
    ? udimPixels(padding.PaddingBottom, surface.height)
    : 0
  let needWidth = 0
  let needHeight = 0
  const reach = (right: number, bottom: number) => {
    needWidth = Math.max(needWidth, right + padRight)
    needHeight = Math.max(needHeight, bottom + padBottom)
  }

  if (withText && isTextClass(node.className) && !p.TextScaled) {
    const wrapAt = p.TextWrapped && p.AutomaticSize === 'Y' ? area.width : null
    const text = textBounds(node, wrapAt)
    reach(area.x + text.width, area.y + text.height)
  }

  const slots = layoutBoxes(doc, node.id, area)
  for (const childId of node.children) {
    const child = doc.nodes[childId]
    if (!child || !resolveProps(child).Visible) continue
    const box = slots ? slots.get(childId) : boxInParent(child, area, doc)
    if (box) reach(area.x + box.x + box.width, area.y + box.y + box.height)
  }
  return { width: needWidth, height: needHeight }
}

// `size` grown to `needs` along the axes an AutomaticSize value names,
// never shrunk.
function growAlong(
  axes: AutomaticSize,
  size: ScreenSize,
  needs: ScreenSize,
): ScreenSize {
  const x = axes === 'X' || axes === 'XY'
  const y = axes === 'Y' || axes === 'XY'
  return {
    width: x ? Math.max(size.width, needs.width) : size.width,
    height: y ? Math.max(size.height, needs.height) : size.height,
  }
}

// AutomaticSize: an element of size `base` grown to fit its text and
// children (contentNeeds). A ScrollingFrame's children sit on its canvas,
// so that's what they're measured on.
function grownSize(
  doc: UiDocument,
  node: UiNode,
  base: ScreenSize,
): ScreenSize {
  const needs = contentNeeds(doc, node, canvasSize(node, base), true)
  return growAlong(resolveProps(node).AutomaticSize, base, needs)
}

// A ScrollingFrame's scrollable canvas: CanvasSize big (Scale meaning a
// fraction of the frame), but never smaller than the frame; with
// AutomaticCanvasSize (given the document, which holds its children) grown
// to fit its children too. Any other element just has its own size.
export function canvasSize(
  node: UiNode,
  size: ScreenSize,
  doc?: UiDocument,
): ScreenSize {
  if (node.className !== 'ScrollingFrame') return size
  const { CanvasSize, AutomaticCanvasSize } = resolveProps(node)
  const canvas = {
    width: Math.max(size.width, CanvasSize.xs * size.width + CanvasSize.xo),
    height: Math.max(size.height, CanvasSize.ys * size.height + CanvasSize.yo),
  }
  if (!doc || AutomaticCanvasSize === 'None') return canvas
  return growAlong(
    AutomaticCanvasSize,
    canvas,
    contentNeeds(doc, node, canvas, false),
  )
}

// `surface` less any UIPadding: where children go, from its corner.
function paddedArea(node: UiNode, surface: ScreenSize): Box {
  const { width, height } = surface
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

// The area an element's children are laid out in, measured from the
// element's top-left corner: its canvas (see canvasSize; give the document
// so AutomaticCanvasSize counts), minus any UIPadding. Children's Scale is
// a fraction of this area, and their Position starts at its corner.
export function contentArea(
  node: UiNode,
  size: ScreenSize,
  doc?: UiDocument,
): Box {
  return paddedArea(node, canvasSize(node, size, doc))
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
      const { width, height } = boxInParent(child, area, doc)
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
  return placed ?? boxInParent(node, area, doc)
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
  const area = contentArea(doc.nodes[parentId], parentBox, doc)
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
  const area = contentArea(doc.nodes[node.parentId], parent, doc)
  const box = boxInContentArea(doc, node, area)
  return {
    ...box,
    x: parent.x + area.x + box.x,
    y: parent.y + area.y + box.y,
  }
}

// Where an element appears on screen once UIScale is applied, with the
// total scale it's drawn at (its own UIScale times its parents'). Roblox
// places an element in its parent's unscaled space, then scales it with
// the parent; its own UIScale then scales it around its AnchorPoint (its
// top-left corner when a layout places it). absoluteBox ignores UIScale,
// because the canvas builds its CSS from it and CSS does the scaling; this
// is for drawing on top of the canvas (like the size label) and matches
// Roblox's AbsoluteSize and AbsolutePosition.
function placedOnScreen(
  doc: UiDocument,
  id: NodeId,
  screen: ScreenSize,
): { box: Box; scale: number } {
  const node = doc.nodes[id]
  if (node.parentId === null)
    return { box: { x: 0, y: 0, ...screen }, scale: 1 }
  const parent = placedOnScreen(doc, node.parentId, screen)
  const k = parent.scale
  // The parent's size before scaling, where its children are laid out.
  const local = { width: parent.box.width / k, height: parent.box.height / k }
  const area = contentArea(doc.nodes[node.parentId], local, doc)
  const b = boxInContentArea(doc, node, area)
  let box = {
    x: parent.box.x + (area.x + b.x) * k,
    y: parent.box.y + (area.y + b.y) * k,
    width: b.width * k,
    height: b.height * k,
  }
  const s = resolveModifier(node, 'UIScale')?.Scale ?? 1
  if (s !== 1) {
    const anchor = isLaidOut(doc, id)
      ? { x: 0, y: 0 }
      : resolveProps(node).AnchorPoint
    box = {
      x: box.x + anchor.x * box.width * (1 - s),
      y: box.y + anchor.y * box.height * (1 - s),
      width: box.width * s,
      height: box.height * s,
    }
  }
  return { box, scale: k * s }
}

// How many times bigger an element is drawn than its own pixels say: its
// UIScale times all its parents' (1 when nothing is scaled). Dragging uses
// it to turn pointer movement into the element's own pixels.
export function drawnScale(
  doc: UiDocument,
  id: NodeId,
  screen: ScreenSize,
): number {
  return placedOnScreen(doc, id, screen).scale
}

export function visualBox(
  doc: UiDocument,
  id: NodeId,
  screen: ScreenSize,
): Box {
  return placedOnScreen(doc, id, screen).box
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
  const canvas = canvasSize(doc.nodes[id], box, doc)
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
