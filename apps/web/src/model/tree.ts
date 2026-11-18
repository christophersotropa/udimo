import type { NodeId, UiDocument } from './types.ts'

// Questions about the shape of the tree. Plain functions, no React.

// True if `id` is `ancestorId` itself or sits anywhere inside it.
export function isInside(
  doc: UiDocument,
  id: NodeId,
  ancestorId: NodeId,
): boolean {
  let current: NodeId | null = id
  while (current !== null) {
    if (current === ancestorId) return true
    current = doc.nodes[current]?.parentId ?? null
  }
  return false
}

// Drops any id that sits inside another id in the list. When you drag a
// Frame and one of its children together, only the Frame should move:
// the child already moves with it, and moving it too would move it twice.
export function topLevelNodes(doc: UiDocument, ids: NodeId[]): NodeId[] {
  return ids.filter(
    (id) => !ids.some((other) => other !== id && isInside(doc, id, other)),
  )
}
