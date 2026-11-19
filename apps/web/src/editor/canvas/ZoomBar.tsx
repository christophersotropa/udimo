import type { PointerEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { currentView, useViewStore } from '../../store/viewStore.ts'

const ZOOM_STEP = 1.25

const buttonClass =
  'h-7 rounded-md px-2 text-sm text-muted hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-accent'

// Zoom out, the zoom level (click for 100%), zoom in, and fit, in the
// canvas's bottom-right corner. (The device switch is in the top bar.)
export function ZoomBar() {
  const zoom = useViewStore(useShallow((state) => currentView(state).zoom))
  const { zoomBy, zoomTo, fit } = useViewStore.getState()

  return (
    // Stops clicks here from reaching the canvas (which would clear the
    // selection or start a drag).
    <div
      onPointerDown={(event: PointerEvent) => event.stopPropagation()}
      className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg bg-panel p-1 shadow-lg ring-1 ring-line"
    >
      <button
        type="button"
        aria-label="Zoom out"
        title="Zoom out (⌘−)"
        onClick={() => zoomBy(1 / ZOOM_STEP)}
        className={buttonClass}
      >
        −
      </button>
      <button
        type="button"
        title="Zoom to 100%"
        onClick={() => zoomTo(1)}
        className={`${buttonClass} w-14 text-ink tabular-nums`}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        title="Zoom in (⌘+)"
        onClick={() => zoomBy(ZOOM_STEP)}
        className={buttonClass}
      >
        +
      </button>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <button
        type="button"
        title="Fit the screen in view (⌘0)"
        onClick={fit}
        className={buttonClass}
      >
        Fit
      </button>
    </div>
  )
}
