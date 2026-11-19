import { useViewStore } from '../../store/viewStore.ts'

// The pink alignment lines shown while a drag snaps. They're drawn inside
// the zoomed screen, in game pixels, and stay 1 screen pixel thin at any
// zoom (dividing by --canvas-scale undoes the zoom, like the selection
// outline). pointer-events: none lets clicks pass through them.
export function SnapGuides() {
  const guides = useViewStore((state) => state.guides)
  const thin = 'calc(1px / var(--canvas-scale))'

  return guides.map((guide, i) => (
    <div
      key={i}
      className="pointer-events-none absolute bg-pink-500"
      style={
        guide.axis === 'x'
          ? {
              left: guide.position,
              top: guide.from,
              width: thin,
              height: guide.to - guide.from,
            }
          : {
              top: guide.position,
              left: guide.from,
              height: thin,
              width: guide.to - guide.from,
            }
      }
    />
  ))
}
