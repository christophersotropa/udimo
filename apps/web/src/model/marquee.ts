import { resolveProps } from './defaults.ts'
import { type Box, visualBox } from './layout.ts'
import type { ScreenSize } from './screen.ts'
import type { NodeId, UiDocument } from './types.ts'

// The selection box ("marquee"): drag across empty canvas to select every
// element the box touches. Plain functions, no React; the canvas
// (editor/canvas/useCanvasPointer.ts) calls them as the pointer moves.

type Point = { x: number; y: number }

// The rectangle with `a` and `b` as opposite corners, whichever way the
// drag went (up and left gives a negative distance, so take the smaller
// of each pair as the top-left corner).
export function boxBetween(a: Point, b: Point): Box {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

// True if two boxes overlap. Only sharing an edge doesn't count, so a box
// that stops exactly where an element begins doesn't pick it.
export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  )
}

// The elements a selection box picks, in Explorer order: those directly
// inside the ScreenGui that the box touches (not their children, which
// come along with them, like a click on the canvas picks the outer
// element). Hidden and locked elements are skipped, since a click can't
// pick them either. `box` is in game pixels from the screen's top-left.
export function elementsInBox(
  doc: UiDocument,
  box: Box,
  screen: ScreenSize,
): NodeId[] {
  return doc.nodes[doc.rootId].children.filter((id) => {
    const node = doc.nodes[id]
    if (node.locked || !resolveProps(node).Visible) return false
    // As it appears on screen, UIScale included.
    return boxesOverlap(box, visualBox(doc, id, screen))
  })
}
