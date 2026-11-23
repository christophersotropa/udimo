import { create } from 'zustand'
import { fitView, type Point, type View, zoomAt } from '../lib/viewport.ts'
import { DEVICES, type DeviceId, type ScreenSize } from '../model/screen.ts'
import type { Guide } from '../model/snap.ts'
import type { ModifierClass, NodeId } from '../model/types.ts'
import type { SaveStatus } from './autosave.ts'
import {
  clampPanelWidth,
  clampSplit,
  DEFAULT_PANEL_LAYOUT,
  type DropSpot,
  mirrored,
  movePanel,
  type PanelId,
  type PanelLayout,
  type Rect,
  type Side,
} from './panelLayout.ts'

// A panel being dragged by its title bar: where it would dock if let go
// (null: where it already is), and that spot's rectangle in the workspace,
// for drawing it.
export type PanelDrag = {
  id: PanelId
  spot: DropSpot | null
  preview: Rect | null
}

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
  // Opened on a modifier's line in the Explorer: the menu is about that
  // modifier (Edit, Delete), not about the element it's on.
  modifier?: ModifierClass
}

// A request to show a modifier's fields in Properties: from a click on its
// line in the Explorer, or "Edit UICorner" in its menu. A new object each
// time, so asking twice for the same one still counts as a new request.
export type ModifierReveal = { id: NodeId; modifier: ModifierClass }

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
  // Snap to the parent and siblings while dragging (the status bar toggle).
  snapping: boolean
  // The export dialog is open (from the Export button, File menu or ⌘E).
  exportOpen: boolean
  // The text element whose text is being edited on the canvas, else null.
  editingTextId: NodeId | null
  // Properties sections you've folded shut, by title ("Appearance"), so
  // they stay shut as you click from element to element.
  closedSections: string[]
  tool: Tool
  // Autosave's status, or 'off' when the browser blocks storage.
  saveStatus: SaveStatus | 'off'
  contextMenu: ContextMenuState | null
  // An element whose name should switch to a rename box in the Explorer
  // (asked for by F2 or the menu), else null.
  renamingId: NodeId | null
  // Which panels are docked on which side, and the sizes (panelLayout.ts).
  panels: PanelLayout
  panelDrag: PanelDrag | null
  // A short message in the status bar (say, why a dropped file couldn't
  // be used), or null. It clears itself after a few seconds.
  notice: string | null
  // The latest "show this modifier's fields" request (ModifiersSection
  // opens and scrolls to it), or null.
  modifierReveal: ModifierReveal | null

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
  setSnapping: (on: boolean) => void
  setExportOpen: (open: boolean) => void
  toggleSection: (title: string) => void
  setEditingTextId: (id: NodeId | null) => void
  setSaveStatus: (status: SaveStatus | 'off') => void
  openContextMenu: (menu: ContextMenuState) => void
  closeContextMenu: () => void
  setRenamingId: (id: NodeId | null) => void
  setSideWidth: (side: Side, width: number) => void
  setPanelSplit: (split: number) => void
  dockPanel: (id: PanelId, spot: DropSpot) => void
  // Flips the panels left to right.
  swapPanels: () => void
  // Back to the starting layout: Explorer left, Properties right.
  resetPanels: () => void
  setPanelDrag: (drag: PanelDrag | null) => void
  showNotice: (text: string) => void
  // Asks Properties to open a modifier's fields, unfolding the Modifiers
  // section first if you had folded it shut.
  revealModifier: (id: NodeId, modifier: ModifierClass) => void
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

// How long a status bar notice stays, in ms.
const NOTICE_MS = 5000
let noticeTimer: ReturnType<typeof setTimeout> | undefined

export function createViewStore() {
  return create<ViewState>()((set, get) => ({
    device: 'pc',
    area: { width: 0, height: 0 },
    custom: null,
    guides: [],
    snapping: true,
    exportOpen: false,
    closedSections: [],
    editingTextId: null,
    tool: 'select',
    saveStatus: 'saved',
    contextMenu: null,
    renamingId: null,
    panels: DEFAULT_PANEL_LAYOUT,
    panelDrag: null,
    notice: null,
    modifierReveal: null,

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
    setSnapping: (snapping) => set({ snapping }),
    setExportOpen: (exportOpen) => set({ exportOpen }),
    setEditingTextId: (editingTextId) => set({ editingTextId }),
    toggleSection: (title) =>
      set({
        closedSections: get().closedSections.includes(title)
          ? get().closedSections.filter((t) => t !== title)
          : [...get().closedSections, title],
      }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    openContextMenu: (contextMenu) => set({ contextMenu }),
    closeContextMenu: () => set({ contextMenu: null }),
    setRenamingId: (renamingId) => set({ renamingId }),

    setSideWidth: (side, width) => {
      const panels = get().panels
      const clamped = clampPanelWidth(width)
      if (panels.widths[side] === clamped) return // nothing to redraw
      set({
        panels: { ...panels, widths: { ...panels.widths, [side]: clamped } },
      })
    },
    setPanelSplit: (split) =>
      set({ panels: { ...get().panels, split: clampSplit(split) } }),
    dockPanel: (id, spot) => set({ panels: movePanel(get().panels, id, spot) }),
    swapPanels: () => set({ panels: mirrored(get().panels) }),
    resetPanels: () => set({ panels: DEFAULT_PANEL_LAYOUT }),
    setPanelDrag: (panelDrag) => set({ panelDrag }),
    showNotice: (text) => {
      set({ notice: text })
      clearTimeout(noticeTimer)
      noticeTimer = setTimeout(() => set({ notice: null }), NOTICE_MS)
    },

    revealModifier: (id, modifier) =>
      set({
        modifierReveal: { id, modifier },
        // The section title Section folds by (ModifiersSection).
        closedSections: get().closedSections.filter((t) => t !== 'Modifiers'),
      }),

    setGuides: (guides) => {
      // Skip the update (and the redraw) when there were none and still are.
      if (guides.length === 0 && get().guides.length === 0) return
      set({ guides })
    },
  }))
}

// The one view store the editor uses.
export const useViewStore = createViewStore()
