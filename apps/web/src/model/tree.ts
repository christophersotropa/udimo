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

// The ids of a node's parent, grandparent and so on, up to the root.
export function ancestorIds(doc: UiDocument, id: NodeId): NodeId[] {
  const ancestors: NodeId[] = []
  let current = doc.nodes[id]?.parentId ?? null
  while (current !== null) {
    ancestors.push(current)
    current = doc.nodes[current]?.parentId ?? null
  }
  return ancestors
}

// Drops any id that sits inside another id in the list. When you drag a
// Frame and one of its children together, only the Frame should move:
// the child already moves with it, and moving it too would move it twice.
export function topLevelNodes(doc: UiDocument, ids: NodeId[]): NodeId[] {
  return ids.filter(
    (id) => !ids.some((other) => other !== id && isInside(doc, id, other)),
  )
}

// `ids` sorted in the order their rows appear in the Explorer (top to
// bottom), which is also the order they're exported in.
export function inTreeOrder(doc: UiDocument, ids: NodeId[]): NodeId[] {
  const order: NodeId[] = []
  // Visit a node, then each child in turn, all the way down.
  function visit(id: NodeId) {
    order.push(id)
    for (const childId of doc.nodes[id].children) visit(childId)
  }
  visit(doc.rootId)
  return order.filter((id) => ids.includes(id))
}
