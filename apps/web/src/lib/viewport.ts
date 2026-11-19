import type { ScreenSize } from '../model/screen.ts'

// The maths of zooming and panning the canvas. Plain functions, no React.
//
// A view says how the game screen is drawn inside the canvas area: shrunk
// or grown by `zoom` (1 = 100%), with its top-left corner at (x, y) in the
// canvas area's pixels.
export type View = { zoom: number; x: number; y: number }
export type Point = { x: number; y: number }

export const MIN_ZOOM = 0.1 // 10%
export const MAX_ZOOM = 4 // 400%
// Space left around the screen when it's fitted to the canvas area.
const FIT_MARGIN = 32

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

// The view that shows the whole screen as big as it fits, centered.
export function fitView(area: ScreenSize, screen: ScreenSize): View {
  const zoom = Math.max(
    0,
    Math.min(
      (area.width - FIT_MARGIN * 2) / screen.width,
      (area.height - FIT_MARGIN * 2) / screen.height,
    ),
  )
  return {
    zoom,
    x: (area.width - screen.width * zoom) / 2,
    y: (area.height - screen.height * zoom) / 2,
  }
}

// Zooms to `zoom`, keeping the screen spot under `point` (in canvas area
// pixels) exactly where it is, so zooming feels anchored to the pointer.
export function zoomAt(view: View, point: Point, zoom: number): View {
  const next = clampZoom(zoom)
  // Which game pixel is under the pointer now...
  const gameX = (point.x - view.x) / view.zoom
  const gameY = (point.y - view.y) / view.zoom
  // ...and where the corner must go to keep it there at the new zoom.
  return { zoom: next, x: point.x - gameX * next, y: point.y - gameY * next }
}
