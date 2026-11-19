import { useDocumentStore } from '../../store/documentStore.ts'

// Replacing the document also clears undo, so ask first, unless there's
// nothing to lose (an empty ScreenGui).
export function confirmReplace(): boolean {
  const doc = useDocumentStore.getState().document
  if (doc.nodes[doc.rootId].children.length === 0) return true
  return window.confirm(
    'This replaces your current design, and it can’t be undone. ' +
      'Use Save first if you want to keep it. Continue?',
  )
}
