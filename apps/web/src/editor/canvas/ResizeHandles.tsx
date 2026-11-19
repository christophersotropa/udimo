import type { CSSProperties } from 'react'
import type { Handle } from '../../lib/resize.ts'

// The 8 handles: 4 corners and the middle of each edge.
const HANDLES: Handle[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
]

// The mouse cursor that shows which way each handle resizes.
function cursorFor({ x, y }: Handle): string {
  if (x === 0) return 'ns-resize' // top or bottom edge: up/down
  if (y === 0) return 'ew-resize' // left or right edge: left/right
  return x === y ? 'nwse-resize' : 'nesw-resize' // corners: diagonal
}

// Small amber squares drawn inside the selected element, centered on its
// edges. Each handle is 13 screen pixels (easy to grab) but transparent,
// with only a 7-pixel square painted in its middle. Sizes are divided by
// --canvas-scale, so they stay the same on screen at any zoom.
// useCanvasPointer finds them by their data-handle-x / data-handle-y.
export function ResizeHandles() {
  return HANDLES.map((handle) => {
    const style: CSSProperties = {
      position: 'absolute',
      // -1 -> 0%, 0 -> 50%, 1 -> 100%: the left edge, middle or right edge.
      left: `${((handle.x + 1) / 2) * 100}%`,
      top: `${((handle.y + 1) / 2) * 100}%`,
      width: 'calc(13px / var(--canvas-scale))',
      height: 'calc(13px / var(--canvas-scale))',
      transform: 'translate(-50%, -50%)',
      // A one-colour "gradient" is the simplest way to paint a smaller
      // square in the middle of a box.
      background:
        'linear-gradient(var(--color-accent), var(--color-accent)) center / calc(7px / var(--canvas-scale)) calc(7px / var(--canvas-scale)) no-repeat',
      cursor: cursorFor(handle),
      zIndex: 10_000, // above the element's own children
    }
    return (
      <div
        key={`${handle.x},${handle.y}`}
        data-handle-x={handle.x}
        data-handle-y={handle.y}
        style={style}
      />
    )
  })
}
