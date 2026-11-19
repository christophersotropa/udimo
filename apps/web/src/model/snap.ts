import { resolveProps } from './defaults.ts'
import { absoluteBox, type Box, contentArea } from './layout.ts'
import type { ScreenSize } from './screen.ts'
import type { NodeId, UiDocument } from './types.ts'

// Snapping and alignment guides: while you drag or resize, edges and centers
// jump into line with the parent's edges and center, and with siblings'.
// Plain TypeScript, no React.
//
// Everything here is measured in game pixels from the corner of the parent's
// content area, the same space elements are positioned in.

export type Axis = 'x' | 'y'

// Lines an edge or center can snap to, on each axis. Each remembers the
// box it came from, so a guide can be drawn from that box to the element.
// `label` says what lining up with it means, like "center".
export type SnapLine = { position: number; source: Box; label?: string }
export type SnapTargets = { x: SnapLine[]; y: SnapLine[] }

// A guide line to draw: on the 'x' axis it's vertical, at x = position,
// running from `from` to `to` down the screen. In the same space as above.
export type Guide = {
  axis: Axis
  position: number
  from: number
  to: number
  label?: string // shown next to the line, e.g. "center"
}

// The three lines of a box on one axis: its start edge, center and end edge.
function linesOf(box: Box, axis: Axis): number[] {
  const start = axis === 'x' ? box.x : box.y
  const length = axis === 'x' ? box.width : box.height
  return [start, start + length / 2, start + length]
}

// The lines to snap to: the parent area's edges and center, and each
// sibling's edges and center.
// With `labelCenter`, the parent's center lines are labelled "center".
export function snapTargets(
  area: ScreenSize,
  siblings: Box[],
  labelCenter = false,
): SnapTargets {
  // Only width and height: the area's own corner is 0, 0 in this space.
  // (Spreading `...area` would let a content area's x and y slip in.)
  const parent = { x: 0, y: 0, width: area.width, height: area.height }
  const targets: SnapTargets = { x: [], y: [] }
  for (const box of [parent, ...siblings]) {
    for (const axis of ['x', 'y'] as const) {
      linesOf(box, axis).forEach((position, i) => {
        const isParentCenter = box === parent && i === 1
        targets[axis].push({
          position,
          source: box,
          ...(isParentCenter && labelCenter ? { label: 'center' } : {}),
        })
      })
    }
  }
  return targets
}

// How far to shift `edges` (on one axis) so the closest one lands exactly on
// a target, or 0 if none is within `threshold`.
function nearestShift(
  edges: number[],
  targets: SnapLine[],
  threshold: number,
): number {
  let best = 0
  let bestDistance = threshold
  for (const edge of edges) {
    for (const target of targets) {
      const distance = Math.abs(target.position - edge)
      if (distance <= bestDistance) {
        bestDistance = distance
        best = target.position - edge
      }
    }
  }
  return best
}

// The guides for a box that's already been snapped: one for every target
// that one of its lines now sits on. Each runs from the target's box to the
// element, so you can see what it lined up with.
function guidesFor(
  box: Box,
  targets: SnapTargets,
  edgesOn: (axis: Axis) => number[],
): Guide[] {
  const guides: Guide[] = []
  for (const axis of ['x', 'y'] as const) {
    const across: Axis = axis === 'x' ? 'y' : 'x'
    for (const target of targets[axis]) {
      if (
        !edgesOn(axis).some((edge) => Math.abs(edge - target.position) < 0.5)
      ) {
        continue
      }
      const ends = [...linesOf(box, across), ...linesOf(target.source, across)]
      guides.push({
        axis,
        position: target.position,
        from: Math.min(...ends),
        to: Math.max(...ends),
        ...(target.label ? { label: target.label } : {}),
      })
    }
  }
  return guides
}

function moved(box: Box, dx: number, dy: number): Box {
  return { ...box, x: box.x + dx, y: box.y + dy }
}

// Snapping while moving: `box` is where the element would be. Returns how
// much to shift it so an edge or center lines up, and the guides to draw.
export function snapMove(
  box: Box,
  targets: SnapTargets,
  threshold: number,
): { dx: number; dy: number; guides: Guide[] } {
  const dx = nearestShift(linesOf(box, 'x'), targets.x, threshold)
  const dy = nearestShift(linesOf(box, 'y'), targets.y, threshold)
  const snapped = moved(box, dx, dy)
  return {
    dx,
    dy,
    guides: guidesFor(snapped, targets, (axis) => linesOf(snapped, axis)),
  }
}

// Snapping while resizing: only the edges being dragged move, so only they
// snap. `sides` says which ones per axis (-1 start edge, 1 end edge, 0
// none), like resize handles. Returns how far to move each dragged edge.
export function snapResize(
  box: Box,
  sides: { x: -1 | 0 | 1; y: -1 | 0 | 1 },
  targets: SnapTargets,
  threshold: number,
): { dx: number; dy: number; guides: Guide[] } {
  const edge = (axis: Axis): number[] => {
    const side = sides[axis]
    if (side === 0) return []
    const [start, , end] = linesOf(box, axis)
    return [side === -1 ? start : end]
  }
  const dx = nearestShift(edge('x'), targets.x, threshold)
  const dy = nearestShift(edge('y'), targets.y, threshold)

  // Move the dragged edges, keeping the opposite ones still.
  const snapped = { ...box }
  if (sides.x === -1)
    Object.assign(snapped, { x: box.x + dx, width: box.width - dx })
  if (sides.x === 1) snapped.width = box.width + dx
  if (sides.y === -1)
    Object.assign(snapped, { y: box.y + dy, height: box.height - dy })
  if (sides.y === 1) snapped.height = box.height + dy

  const draggedEdges = (axis: Axis) => {
    const side = sides[axis]
    if (side === 0) return []
    const [start, , end] = linesOf(snapped, axis)
    return [side === -1 ? start : end]
  }
  return { dx, dy, guides: guidesFor(snapped, targets, draggedEdges) }
}

// Everything a drag needs to snap: where the parent's content area is on
// the screen (to draw guides), the lines to snap to, and the dragged
// elements' combined box when the drag began. Null when the elements don't
// share a parent, so there's no single space to snap in.
export type SnapContext = {
  origin: { x: number; y: number } // the content area's corner, on screen
  targets: SnapTargets
  start: Box
}

export function snapContext(
  doc: UiDocument,
  ids: NodeId[],
  screen: ScreenSize,
): SnapContext | null {
  if (ids.length === 0) return null
  const parentId = doc.nodes[ids[0]].parentId
  if (parentId === null) return null
  if (ids.some((id) => doc.nodes[id].parentId !== parentId)) return null

  const parentBox = absoluteBox(doc, parentId, screen)
  const area = contentArea(doc.nodes[parentId], parentBox)
  const origin = { x: parentBox.x + area.x, y: parentBox.y + area.y }
  const local = (id: NodeId): Box => {
    const box = absoluteBox(doc, id, screen)
    return { ...box, x: box.x - origin.x, y: box.y - origin.y }
  }

  // Visible siblings that aren't being dragged.
  const siblings = doc.nodes[parentId].children
    .filter((id) => !ids.includes(id) && resolveProps(doc.nodes[id]).Visible)
    .map(local)

  // The box around everything being dragged.
  const boxes = ids.map(local)
  const left = Math.min(...boxes.map((b) => b.x))
  const top = Math.min(...boxes.map((b) => b.y))
  const right = Math.max(...boxes.map((b) => b.x + b.width))
  const bottom = Math.max(...boxes.map((b) => b.y + b.height))

  return {
    origin,
    targets: snapTargets(area, siblings, true),
    start: { x: left, y: top, width: right - left, height: bottom - top },
  }
}
