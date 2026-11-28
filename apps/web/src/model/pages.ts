import { sortForLayout } from './arrange.ts'
import { resolveProps } from './defaults.ts'
import { isLaidOut } from './layout.ts'
import { resolveModifier } from './modifiers.ts'
import type { NodeId, UiDocument } from './types.ts'

// Questions about UIPageLayout's pages, for the canvas's page controls and
// for turning to the page that holds whatever you select. Plain functions,
// no React. (Where the pages go is arrangePages, in arrange.ts.)

// The pages of an element with a UIPageLayout, in the order its layout
// puts them (its visible children, sorted by its SortOrder). Empty if it
// has no UIPageLayout.
export function pagesOf(doc: UiDocument, ownerId: NodeId): NodeId[] {
  const owner = doc.nodes[ownerId]
  const page = owner && resolveModifier(owner, 'UIPageLayout')
  if (!page) return []
  const items = owner.children
    .filter((id) => isLaidOut(doc, id))
    .map((id) => ({
      id,
      name: doc.nodes[id].name,
      layoutOrder: resolveProps(doc.nodes[id]).LayoutOrder,
      width: 0, // sorting doesn't look at sizes
      height: 0,
    }))
  return sortForLayout(items, page.SortOrder).map((item) => item.id)
}

// The page the canvas shows: the one picked (UiNode.shownPage) if it's
// still one of the pages, otherwise the first, like a game starts on.
// null if there are no pages.
export function shownPageOf(doc: UiDocument, ownerId: NodeId): NodeId | null {
  const pages = pagesOf(doc, ownerId)
  const picked = doc.nodes[ownerId]?.shownPage
  return picked && pages.includes(picked) ? picked : (pages[0] ?? null)
}

// The pages to turn to so that `id` can be seen: `id` itself if it's a
// page, and each page it sits inside (a page layout can hold another).
export function pagesHolding(doc: UiDocument, id: NodeId): NodeId[] {
  const pages: NodeId[] = []
  let current: NodeId | null = id
  while (current !== null) {
    const node: (typeof doc.nodes)[NodeId] | undefined = doc.nodes[current]
    if (!node || node.parentId === null) break
    const parent = doc.nodes[node.parentId]
    if (parent.modifiers?.UIPageLayout && isLaidOut(doc, current)) {
      pages.push(current)
    }
    current = node.parentId
  }
  return pages
}

// The element whose pages to show controls for: `id` itself if it has a
// UIPageLayout, else the nearest one it sits inside. null if none, or if
// it has fewer than two pages (nothing to turn).
export function pageLayoutAround(doc: UiDocument, id: NodeId): NodeId | null {
  let current: NodeId | null = id
  while (current !== null) {
    const node: (typeof doc.nodes)[NodeId] | undefined = doc.nodes[current]
    if (!node) return null
    if (node.modifiers?.UIPageLayout) {
      return pagesOf(doc, current).length > 1 ? current : null
    }
    current = node.parentId
  }
  return null
}
