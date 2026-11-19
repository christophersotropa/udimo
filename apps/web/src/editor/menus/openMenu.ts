import type { NodeId } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { useViewStore } from '../../store/viewStore.ts'

// Opens the right-click menu for `targetId` at a point on the page.
// Like most editors, right-clicking something that isn't selected selects
// just it first; right-clicking part of a multi-selection keeps it, so the
// menu acts on all of it. (The ScreenGui can't be selected.)
export function openMenuFor(
  targetId: NodeId,
  x: number,
  y: number,
  insertOnly = false,
) {
  const store = useDocumentStore.getState()
  if (targetId === store.document.rootId) {
    store.clearSelection()
  } else if (!store.selection.includes(targetId)) {
    store.select(targetId)
  }
  useViewStore.getState().openContextMenu({ x, y, targetId, insertOnly })
}
