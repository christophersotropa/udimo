import type { UDim2, Vector2 } from '../model/types.ts'

// Which handle is being dragged, per axis: -1 = left/top edge,
// 1 = right/bottom edge, 0 = this axis doesn't change (the middle handles
// on the top and bottom edges only resize height, for example).
export type HandleSide = -1 | 0 | 1
export type Handle = { x: HandleSide; y: HandleSide }

export type ResizeStart = {
  size: UDim2
  position: UDim2
  anchorPoint: Vector2
  // The element's current width and height in game pixels (Scale and Offset
  // added up), so we know how far it can shrink.
  pixelWidth: number
  pixelHeight: number
}

const MIN_SIZE = 1 // pixels: an element can't shrink past this

// One axis. `delta` is how far the pointer moved, in game pixels.
// Returns how much to add to Size's offset and to Position's offset.
function resizeAxis(
  side: HandleSide,
  delta: number,
  anchor: number,
  pixelSize: number,
) {
  if (side === 0) return { size: 0, position: 0 }

  // Dragging the far edge outward grows the element; dragging the near
  // edge outward (to the left/up, so a negative delta) also grows it.
  // Never shrink below MIN_SIZE.
  const grow = Math.max(side * delta, MIN_SIZE - pixelSize)

  // Position marks where the AnchorPoint sits. The opposite edge must stay
  // still, so Position moves by the part of the growth on the anchor's side:
  // anchor 0 (left edge): dragging right moves nothing, dragging left moves all of it;
  // anchor 0.5 (center): half either way; anchor 1 (right edge): the reverse.
  const share = side === 1 ? anchor : -(1 - anchor)
  return { size: grow, position: grow * share }
}

// The new Size and Position after dragging `handle` by (dx, dy) game pixels
// from where the resize began. Only Offset changes, rounded to whole pixels.
export function resizeBox(
  start: ResizeStart,
  handle: Handle,
  dx: number,
  dy: number,
): { size: UDim2; position: UDim2 } {
  const x = resizeAxis(handle.x, dx, start.anchorPoint.x, start.pixelWidth)
  const y = resizeAxis(handle.y, dy, start.anchorPoint.y, start.pixelHeight)

  return {
    size: {
      ...start.size,
      xo: Math.round(start.size.xo + x.size),
      yo: Math.round(start.size.yo + y.size),
    },
    position: {
      ...start.position,
      xo: Math.round(start.position.xo + x.position),
      yo: Math.round(start.position.yo + y.position),
    },
  }
}
