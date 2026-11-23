import type { PanelId } from '../../store/panelLayout.ts'
import { useViewStore } from '../../store/viewStore.ts'

const TITLES: Record<PanelId, string> = {
  explorer: 'Explorer',
  properties: 'Properties',
}

// While a panel is dragged by its title bar: an accent-coloured box where it will
// dock if let go. Drawn over the workspace (App places it there).
export function PanelDropPreview() {
  const drag = useViewStore((state) => state.panelDrag)
  if (!drag?.preview) return null
  const { x, y, width, height } = drag.preview
  return (
    <div
      className="pointer-events-none absolute z-30 flex items-center justify-center bg-accent-soft ring-2 ring-accent ring-inset"
      style={{ left: x, top: y, width, height }}
    >
      <p className="rounded bg-raised px-3 py-1.5 text-xs text-ink shadow-lg shadow-black/40">
        Dock {TITLES[drag.id]} here
      </p>
    </div>
  )
}
