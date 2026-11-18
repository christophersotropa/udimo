import type { UDim2, Vector2 } from '../model/types.ts'

// One axis of a UDim2 as a CSS length. Scale is a fraction of the parent
// (0.5 -> 50%), Offset is pixels, and Roblox adds them together.
// Examples: (0.5, 0) -> "50%", (0, 20) -> "20px", (1, -16) -> "calc(100% - 16px)"
export function udimToCss(scale: number, offset: number): string {
  if (offset === 0) return `${scale * 100}%`
  if (scale === 0) return `${offset}px`
  const sign = offset < 0 ? '-' : '+'
  return `calc(${scale * 100}% ${sign} ${Math.abs(offset)}px)`
}

// A Position moved by (dx, dy) game pixels. Only Offset changes, like
// dragging in Studio, and it's rounded because Roblox offsets are whole pixels.
export function addOffset(position: UDim2, dx: number, dy: number): UDim2 {
  return {
    ...position,
    xo: Math.round(position.xo + dx),
    yo: Math.round(position.yo + dy),
  }
}

export type BoxCss = {
  left: string
  top: string
  width: string
  height: string
  transform: string
}

// Where an element sits inside its parent, as CSS for an absolutely
// positioned element.
// Position says where the AnchorPoint goes. AnchorPoint (0..1 on each axis)
// says which point of the element that is: (0, 0) top-left, (0.5, 0.5) center.
// CSS translate percentages refer to the element's own size, so shifting by
// -AnchorPoint * 100% puts that point exactly on Position.
export function boxCss(
  size: UDim2,
  position: UDim2,
  anchorPoint: Vector2,
): BoxCss {
  return {
    left: udimToCss(position.xs, position.xo),
    top: udimToCss(position.ys, position.yo),
    width: udimToCss(size.xs, size.xo),
    height: udimToCss(size.ys, size.yo),
    transform: `translate(${-anchorPoint.x * 100}%, ${-anchorPoint.y * 100}%)`,
  }
}
