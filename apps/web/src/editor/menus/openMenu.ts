import type { ModifierClass, NodeId } from '../../model/types.ts'
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

// Opens the right-click menu for one modifier on an element (its line in
// the Explorer). The element is selected, as a click on the line does, but
// the menu's actions are the modifier's own: Studio users expect Delete on
// a UICorner line to remove the corner, never the Frame it's on.
export function openModifierMenu(
  ownerId: NodeId,
  modifier: ModifierClass,
  x: number,
  y: number,
) {
  useDocumentStore.getState().select(ownerId)
  useViewStore.getState().openContextMenu({ x, y, targetId: ownerId, modifier })
}
