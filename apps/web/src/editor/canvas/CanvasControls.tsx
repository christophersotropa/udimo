import type { PointerEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DEVICES, type DeviceId } from '../../model/screen.ts'
import { currentView, useViewStore } from '../../store/viewStore.ts'

const ZOOM_STEP = 1.25

const buttonClass =
  'rounded px-1.5 py-0.5 text-zinc-300 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-blue-500'

// The bar at the bottom of the canvas: device, zoom out, zoom level, zoom
// in, fit.
export function CanvasControls() {
  const device = useViewStore((state) => state.device)
  const zoom = useViewStore(useShallow((state) => currentView(state).zoom))
  const { setDevice, zoomBy, zoomTo, fit } = useViewStore.getState()

  return (
    // Stops clicks here from reaching the canvas (which would clear the
    // selection or start a drag).
    <div
      onPointerDown={(event: PointerEvent) => event.stopPropagation()}
      className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-zinc-900/90 px-1.5 py-1 text-xs ring-1 ring-zinc-800"
    >
      <select
        aria-label="Device"
        value={device}
        onChange={(event) => setDevice(event.target.value as DeviceId)}
        className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        {(Object.keys(DEVICES) as DeviceId[]).map((id) => (
          <option key={id} value={id}>
            {DEVICES[id].label} · {DEVICES[id].width} × {DEVICES[id].height}
          </option>
        ))}
      </select>
      <span className="mx-1 h-4 w-px bg-zinc-700" />
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
        className={`${buttonClass} w-12 tabular-nums`}
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
