import { type RefObject, useLayoutEffect, useState } from 'react'

// How much to shrink a `width` x `height` box so it fits inside the element
// `ref` points to, leaving `padding` pixels on each side. Updates whenever
// that element changes size (window resized, panels changed).
export function useFitScale(
  ref: RefObject<HTMLElement | null>,
  width: number,
  height: number,
  padding = 32,
): number {
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    // ResizeObserver is a browser feature that calls us when an element's size changes.
    const observer = new ResizeObserver(([entry]) => {
      const available = entry.contentRect
      const fit = Math.min(
        (available.width - padding * 2) / width,
        (available.height - padding * 2) / height,
      )
      setScale(Math.max(0, fit))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, width, height, padding])

  return scale
}
