// How fast to scroll a list while something is dragged near its edge, in
// pixels per frame: 0 in the middle, faster the closer the pointer gets to
// the top (negative: scroll up) or bottom (positive: scroll down) edge, and
// at full speed past it. Plain maths, so it's easy to test.

// How close to an edge, in pixels, scrolling starts.
export const AUTO_SCROLL_ZONE = 32
// The fastest it scrolls, in pixels per frame (about 60 frames a second).
export const AUTO_SCROLL_MAX = 12

export function autoScrollSpeed(
  y: number,
  top: number,
  bottom: number,
): number {
  const fromTop = y - top
  const fromBottom = bottom - y
  if (fromTop < AUTO_SCROLL_ZONE) {
    return -AUTO_SCROLL_MAX * Math.min(1, 1 - fromTop / AUTO_SCROLL_ZONE)
  }
  if (fromBottom < AUTO_SCROLL_ZONE) {
    return AUTO_SCROLL_MAX * Math.min(1, 1 - fromBottom / AUTO_SCROLL_ZONE)
  }
  return 0
}
