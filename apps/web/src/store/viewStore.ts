import { create } from 'zustand'
import { fitView, type Point, type View, zoomAt } from '../lib/viewport.ts'
import { DEVICES, type DeviceId, type ScreenSize } from '../model/screen.ts'
import type { Guide } from '../model/snap.ts'
import type { NodeId } from '../model/types.ts'
import type { SaveStatus } from './autosave.ts'

// What a left-drag on the canvas does: select and move, or pan the view.
export type Tool = 'select' | 'hand'

// An open right-click menu: where it is on the page, and the element it's
// about (the ScreenGui for empty canvas). `insertOnly` opens just the
// Insert Object list (from a "+" button).
export type ContextMenuState = {
  x: number
  y: number
  targetId: NodeId
  insertOnly?: boolean
}

// Editor view state: which device screen is shown, and how it's zoomed and
// panned. Like the selection it's not part of the document, so it's never
// undone, saved or exported. It's a separate store, so zooming doesn't
// touch the document store at all.

export type ViewState = {
  device: DeviceId
  // The canvas area's size, kept up to date by the Canvas.
  area: ScreenSize
  // A view you chose by zooming or panning, or null for "fit to the area".
  custom: View | null
  // Alignment guides to draw while a drag is snapping, in game pixels from
  // the screen's top-left corner. Empty when nothing is snapping.
  guides: Guide[]
  tool: Tool
  // Autosave's status, or 'off' when the browser blocks storage.
  saveStatus: SaveStatus | 'off'
  contextMenu: ContextMenuState | null
  // An element whose name should switch to a rename box in the Explorer
  // (asked for by F2 or the menu), else null.
  renamingId: NodeId | null

  setDevice: (device: DeviceId) => void
  setArea: (area: ScreenSize) => void
  fit: () => void
  // Zooms by a factor (2 = twice as big) around a point of the canvas area;
  // its center if no point is given.
  zoomBy: (factor: number, point?: Point) => void
  zoomTo: (zoom: number) => void
  panBy: (dx: number, dy: number) => void
  setGuides: (guides: Guide[]) => void
  setTool: (tool: Tool) => void
  setSaveStatus: (status: SaveStatus | 'off') => void
  openContextMenu: (menu: ContextMenuState) => void
  closeContextMenu: () => void
  setRenamingId: (id: NodeId | null) => void
}

// The screen size for a device.
export function screenOf(state: Pick<ViewState, 'device'>): ScreenSize {
  return DEVICES[state.device]
}

// The view to draw right now: the one you chose, or the fitted one.
export function currentView(
  state: Pick<ViewState, 'device' | 'area' | 'custom'>,
): View {
  return state.custom ?? fitView(state.area, screenOf(state))
}

export function createViewStore() {
  return create<ViewState>()((set, get) => ({
    device: 'pc',
    area: { width: 0, height: 0 },
    custom: null,
    guides: [],
    tool: 'select',
    saveStatus: 'saved',
    contextMenu: null,
    renamingId: null,

    // A new device starts fitted, since the old zoom may not suit it.
    setDevice: (device) => set({ device, custom: null }),
    setArea: (area) => set({ area }),
    fit: () => set({ custom: null }),

    zoomBy: (factor, point) => {
      const state = get()
      const view = currentView(state)
      const at = point ?? { x: state.area.width / 2, y: state.area.height / 2 }
      set({ custom: zoomAt(view, at, view.zoom * factor) })
    },

    zoomTo: (zoom) => {
      const state = get()
      const center = { x: state.area.width / 2, y: state.area.height / 2 }
      set({ custom: zoomAt(currentView(state), center, zoom) })
    },

    panBy: (dx, dy) => {
      const view = currentView(get())
      set({ custom: { ...view, x: view.x + dx, y: view.y + dy } })
    },

    setTool: (tool) => set({ tool }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    openContextMenu: (contextMenu) => set({ contextMenu }),
    closeContextMenu: () => set({ contextMenu: null }),
    setRenamingId: (renamingId) => set({ renamingId }),

    setGuides: (guides) => {
      // Skip the update (and the redraw) when there were none and still are.
      if (guides.length === 0 && get().guides.length === 0) return
      set({ guides })
    },
  }))
}

// The one view store the editor uses.
export const useViewStore = createViewStore()
