import { resolveProps } from '../model/defaults.ts'
import { CATALOG } from '../model/catalog.ts'
import { planWrap } from '../model/wrap.ts'
import {
  copyToClipboard,
  hasClipboard,
  pasteFromClipboard,
} from '../store/clipboard.ts'
import {
  type ArrangeMove,
  arrangeSelection,
  deleteSelection,
  duplicateSelection,
  insertObject,
  selectAll,
  setLockedAll,
  setVisible,
  wrapSelectionInFrame,
} from '../store/commands.ts'
import {
  type ElementClassName,
  useDocumentStore,
} from '../store/documentStore.ts'
import { screenOf, useViewStore } from '../store/viewStore.ts'

// The editor's actions, in one place, so the menu bar, the right-click menu
// and the keyboard shortcuts all do exactly the same thing. They read the
// stores when called, so nothing re-renders just because they exist.

const docs = useDocumentStore
const view = () => useViewStore.getState()

const selection = () => docs.getState().selection
const single = () => (selection().length === 1 ? selection()[0] : null)

// True when everything selected is hidden / locked: then Hide and Lock
// become Show and Unlock.
export function selectionHidden(): boolean {
  const { document } = docs.getState()
  return (
    selection().length > 0 &&
    selection().every((id) => !resolveProps(document.nodes[id]).Visible)
  )
}
export function selectionLocked(): boolean {
  const { document } = docs.getState()
  return (
    selection().length > 0 &&
    selection().every((id) => document.nodes[id].locked)
  )
}

export const actions = {
  // Edit
  undo: () => docs.getState().undo(),
  redo: () => docs.getState().redo(),
  cut: () => copyToClipboard(docs, true),
  copy: () => copyToClipboard(docs),
  paste: () => pasteFromClipboard(docs),
  // Into the one selected element (or the ScreenGui when nothing is).
  pasteInto: () =>
    pasteFromClipboard(docs, single() ?? docs.getState().document.rootId),
  duplicate: () => duplicateSelection(docs),
  delete: () => deleteSelection(docs),
  selectAll: () => selectAll(docs),
  rename: () => {
    const id = single()
    if (id) view().setRenamingId(id)
  },

  // Arrange
  group: () => wrapSelectionInFrame(docs, screenOf(view())),
  arrange: (move: ArrangeMove) => arrangeSelection(docs, move),
  toggleHidden: () => setVisible(docs, selection(), selectionHidden()),
  toggleLocked: () => setLockedAll(docs, selection(), !selectionLocked()),

  // Insert: into the one selected element (or next to it), or the screen.
  insert: (className: ElementClassName) => {
    const entry = CATALOG.find((e) => e.className === className)!
    insertObject(docs, single() ?? docs.getState().document.rootId, entry)
  },

  // View
  zoomIn: () => view().zoomBy(1.25),
  zoomOut: () => view().zoomBy(1 / 1.25),
  zoomTo100: () => view().zoomTo(1),
  fit: () => view().fit(),
  toggleSnapping: () => view().setSnapping(!view().snapping),
  swapPanels: () => view().swapPanels(),
  resetPanels: () => view().resetPanels(),

  openExport: () => view().setExportOpen(true),
}

// Which actions make sense right now, for greying out menu items.
export const can = {
  undo: () => docs.getState().past.length > 0,
  redo: () => docs.getState().future.length > 0,
  editSelection: () => selection().length > 0,
  paste: () => hasClipboard(),
  rename: () => single() !== null,
  group: () =>
    planWrap(docs.getState().document, selection(), screenOf(view())) !== null,
}
