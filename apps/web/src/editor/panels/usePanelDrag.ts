import { type PointerEvent, useRef } from 'react'
import {
  dropSpot,
  isSamePlace,
  movePanel,
  type PanelId,
  panelRect,
} from '../../store/panelLayout.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { blockTextSelection } from '../ui/blockTextSelection.ts'

// How far the pointer must move before a press on the title bar becomes a
// drag, so a plain click doesn't start one.
const DRAG_THRESHOLD = 4

// Dragging a panel by its title bar to dock it somewhere else, like Roblox
// Studio: the window's left or right half picks the side, and if another
// panel is docked there, the top or bottom half picks above or below it.
// While dragging, the view store's panelDrag holds the spot and its
// rectangle, so PanelDropPreview can show where it will land.
export function usePanelDrag(id: PanelId) {
  const press = useRef<{
    x: number
    y: number
    unblock: (() => void) | null // set once it's a drag
  } | null>(null)
  const view = () => useViewStore.getState()

  const end = () => {
    press.current?.unblock?.()
    press.current = null
    if (view().panelDrag) view().setPanelDrag(null)
  }

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return
      // The title bar's own buttons (like Explorer's +) stay clickable.
      if ((event.target as Element).closest('button, input')) return
      event.preventDefault() // don't start selecting text
      event.currentTarget.setPointerCapture(event.pointerId)
      press.current = { x: event.clientX, y: event.clientY, unblock: null }
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const p = press.current
      if (!p) return
      if (!p.unblock) {
        const moved = Math.hypot(event.clientX - p.x, event.clientY - p.y)
        if (moved < DRAG_THRESHOLD) return
        p.unblock = blockTextSelection()
      }
      // The workspace: the grid holding the panels and the canvas (App).
      const box = document.getElementById('workspace')?.getBoundingClientRect()
      if (!box) return
      const area = {
        x: box.left,
        y: box.top,
        width: box.width,
        height: box.height,
      }
      const panels = view().panels
      const found = dropSpot(
        panels,
        id,
        { x: event.clientX, y: event.clientY },
        area,
      )
      const spot = isSamePlace(panels, id, found) ? null : found
      // Only update when the spot changes, not on every pixel.
      const was = view().panelDrag?.spot
      if (
        view().panelDrag &&
        was?.side === spot?.side &&
        was?.index === spot?.index
      ) {
        return
      }
      view().setPanelDrag({
        id,
        spot,
        preview: spot ? panelRect(movePanel(panels, id, spot), id, area) : null,
      })
    },
    onPointerUp: () => {
      const spot = view().panelDrag?.spot
      if (press.current?.unblock && spot) view().dockPanel(id, spot)
      end()
    },
    // The drag was interrupted (say, the window lost focus): no move.
    onPointerCancel: end,
    onLostPointerCapture: end,
  }
}
