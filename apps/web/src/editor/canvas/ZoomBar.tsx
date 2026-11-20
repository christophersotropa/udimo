import type { PointerEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { currentView, useViewStore } from '../../store/viewStore.ts'
import { ZoomInIcon, ZoomOutIcon } from '../panels/icons.tsx'
import { IconButton } from '../ui/Button.tsx'

const ZOOM_STEP = 1.25

// Zoom out, the zoom level (click for 100%), zoom in, and Fit, floating in
// the canvas's bottom-right corner.
export function ZoomBar() {
  const zoom = useViewStore(useShallow((state) => currentView(state).zoom))
  const { zoomBy, zoomTo, fit } = useViewStore.getState()

  return (
    // Stops clicks here from reaching the canvas (which would clear the
    // selection or start a drag).
    <div
      onPointerDown={(event: PointerEvent) => event.stopPropagation()}
      className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded bg-panel p-0.5 ring-1 ring-line"
    >
      <IconButton label="Zoom out (⌘−)" onClick={() => zoomBy(1 / ZOOM_STEP)}>
        <ZoomOutIcon />
      </IconButton>
      <button
        type="button"
        title="Zoom to 100%"
        onClick={() => zoomTo(1)}
        className="h-7 w-12 rounded font-mono text-xs text-ink tabular-nums hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
      >
        {Math.round(zoom * 100)}%
      </button>
      <IconButton label="Zoom in (⌘+)" onClick={() => zoomBy(ZOOM_STEP)}>
        <ZoomInIcon />
      </IconButton>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <button
        type="button"
        title="Fit the screen in view (⌘0)"
        onClick={fit}
        className="h-7 rounded px-2 text-body text-muted hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        Fit
      </button>
    </div>
  )
}
