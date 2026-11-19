import type { ReactNode } from 'react'
import { type PanelId, panelCell, sideOf } from '../../store/panelLayout.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { SplitResizer } from './PanelResizer.tsx'
import { usePanelDrag } from './usePanelDrag.ts'

type PanelProps = {
  id: PanelId // which panel: where it's docked comes from the view store
  title: string
  actions?: ReactNode // buttons on the right of the title
  footer?: ReactNode // a line of help pinned to the bottom
  // false: the content goes edge to edge (it brings its own padding).
  padded?: boolean
  children: ReactNode
}

// A docked side panel with a title bar. Its content scrolls on its own, so
// a long Explorer tree never scrolls the whole page. Drag its title bar to
// dock it elsewhere (usePanelDrag), and, when two panels share a side, the
// line between them (SplitResizer). The side's inner edge, for its width,
// is one strip for the whole side, so App draws it (PanelResizer).
export function Panel({
  id,
  title,
  actions,
  footer,
  padded = true,
  children,
}: PanelProps) {
  // The whole layout, then worked out here. (Picking a new object out of
  // the store, like panelCell's, would count as a change on every render.)
  const panels = useViewStore((state) => state.panels)
  const beingDragged = useViewStore((state) => state.panelDrag?.id === id)
  const dragHandlers = usePanelDrag(id)

  const side = sideOf(panels, id)
  const stack = panels[side]
  const isTopOfTwo = stack.length === 2 && stack[0] === id
  const isBottomOfTwo = stack.length === 2 && stack[1] === id
  const border = `${side === 'left' ? 'border-r' : 'border-l'} ${
    isBottomOfTwo ? 'border-t' : ''
  }`

  return (
    <aside
      aria-label={title}
      // Its place in the workspace grid (see panelCell).
      style={panelCell(panels, id)}
      className={`relative flex min-h-0 min-w-0 flex-col border-line bg-panel ${border} ${
        beingDragged ? 'opacity-50' : ''
      }`}
    >
      <div
        {...dragHandlers}
        title="Drag to dock this panel somewhere else"
        className={`flex h-9 shrink-0 touch-none items-center justify-between px-3 select-none ${
          beingDragged ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        {actions}
      </div>
      {/* overflow-x-hidden: only up and down scrolling in a panel. */}
      <div
        data-scroll-area // a drag near its edge scrolls it (useExplorerDrag)
        className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${padded ? 'px-2.5 pb-3' : ''}`}
      >
        {children}
      </div>
      {footer && (
        <p className="border-t border-line px-3.5 py-3 text-xs text-faint">
          {footer}
        </p>
      )}
      {isTopOfTwo && <SplitResizer />}
    </aside>
  )
}
