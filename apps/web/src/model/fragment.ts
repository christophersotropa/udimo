import { createEmptyDocument } from './document.ts'
import { insertParent } from './insert.ts'
import { imagesUsedBy } from './previewImages.ts'
import { inTreeOrder, topLevelNodes } from './tree.ts'
import type { NodeId, UiDocument } from './types.ts'

// A fragment is a small document holding copies of some elements: what
// Copy puts on the clipboard. Its ScreenGui root just holds the copied
// elements; the root itself is never pasted. Plain TypeScript, no React.

// The elements `ids`, with everything inside them, as a fragment.
// They keep their ids here; Paste gives the pasted copies new ones.
export function extractSubtrees(doc: UiDocument, ids: NodeId[]): UiDocument {
  const fragment = createEmptyDocument()
  const root = fragment.nodes[fragment.rootId]

  function add(id: NodeId, parentId: NodeId) {
    const node = doc.nodes[id]
    // The document's nodes never change in place (Immer), so sharing their
    // props and children lists here is safe. Only parentId differs.
    fragment.nodes[id] = { ...node, parentId }
    for (const childId of node.children) add(childId, id)
  }

  // A child selected with its parent is already inside the parent's copy.
  for (const id of inTreeOrder(doc, topLevelNodes(doc, ids))) {
    add(id, fragment.rootId)
    root.children.push(id)
  }
  // The preview pictures they use go too, so a paste into another
  // document (after File > New) still shows them.
  const images = imagesUsedBy(doc, Object.values(fragment.nodes))
  if (Object.keys(images).length > 0) fragment.images = images
  return fragment
}

// Which element pasted elements go into. Like Insert, except when the one
// selected element is one of the copied ones, or a copy from the last paste
// (`pastedBefore`): then the copy goes beside it, not inside it. So copying
// a Frame and pasting twice gives three Frames, not Frames inside Frames.
export function pasteParent(
  doc: UiDocument,
  selection: NodeId[],
  fragment: UiDocument,
  pastedBefore: NodeId[] = [],
): NodeId {
  const [only] = selection
  const isCopied =
    Object.hasOwn(fragment.nodes, only) || pastedBefore.includes(only)
  if (selection.length === 1 && isCopied) {
    return doc.nodes[only]?.parentId ?? doc.rootId
  }
  return insertParent(doc, selection)
}
