import { useSyncExternalStore } from 'react'
import type { ScreenSize } from '../model/screen.ts'

// The browser window's size, kept up to date as it's resized.
// useSyncExternalStore is React's way to read something that lives outside
// React (here, the window) and redraw when it changes: `subscribe` tells
// React when to look again, and `read` is what it reads. `read` returns a
// string, not an object, because React compares the reads with ===, and a
// new object every time would look like a change on every look.
function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}
const read = () => `${window.innerWidth}x${window.innerHeight}`

export function useWindowSize(): ScreenSize {
  const [width, height] = useSyncExternalStore(subscribe, read)
    .split('x')
    .map(Number)
  return { width, height }
}
