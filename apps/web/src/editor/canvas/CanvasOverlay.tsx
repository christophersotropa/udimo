import { useShallow } from 'zustand/react/shallow'
import { resolveProps } from '../../model/defaults.ts'
import { visualBox } from '../../model/layout.ts'
import { resolveModifier } from '../../model/modifiers.ts'
import { pageLayoutAround, pagesOf, shownPageOf } from '../../model/pages.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { currentView, screenOf, useViewStore } from '../../store/viewStore.ts'
import { ScreenLabel } from './ScreenLabel.tsx'

// Everything drawn on top of the design while you work: alignment guides
// (with labels), the selected element's size and a page layout's page
// arrows. It covers the whole screen, above every element, and lets
// clicks through (except on the arrows).
export function CanvasOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1000000]">
      <SnapGuides />
      <SizeBadge />
      <PageControls />
    </div>
  )
}

const THIN = 'calc(1px / var(--canvas-scale))' // 1 screen pixel at any zoom

// The pink alignment lines shown while a drag snaps, and their labels
// ("center").
function SnapGuides() {
  const guides = useViewStore((state) => state.guides)
  return guides.map((guide, i) => (
    <div key={i}>
      <div
        className="absolute bg-guide"
        style={
          guide.axis === 'x'
            ? {
                left: guide.position,
                top: guide.from,
                width: THIN,
                height: guide.to - guide.from,
              }
            : {
                top: guide.position,
                left: guide.from,
                height: THIN,
                width: guide.to - guide.from,
              }
        }
      />
      {guide.label && (
        <ScreenLabel
          tone="guide"
          side={guide.axis === 'x' ? 'above' : 'left'}
          x={guide.axis === 'x' ? guide.position : guide.from}
          y={guide.axis === 'x' ? guide.from : guide.position}
        >
          {guide.label}
        </ScreenLabel>
      )}
    </div>
  ))
}

// The selected element's size in pixels ("248 × 270"), centred under it.
function SizeBadge() {
  const screen = useViewStore(screenOf)
  const badge = useDocumentStore(
    useShallow((state) => {
      if (state.selection.length !== 1) return null
      const id = state.selection[0]
      const node = state.document.nodes[id]
      if (!node || !resolveProps(node).Visible) return null
      // As it appears, UIScale included (Roblox's AbsoluteSize).
      const box = visualBox(state.document, id, screen)
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height,
        text: `${Math.round(box.width)} × ${Math.round(box.height)}`,
      }
    }),
  )
  if (!badge) return null
  return (
    <ScreenLabel side="below" x={badge.x} y={badge.y}>
      {badge.text}
    </ScreenLabel>
  )
}

// How much room (in screen pixels) the page arrows need above an element.
const PAGE_CONTROLS_ROOM = 24

// "‹ 2 / 3 ›" above an element with a UIPageLayout, while it or anything
// inside it is selected: turns its pages on the canvas. The arrows stop at
// the first and last page, unless the layout is Circular.
function PageControls() {
  const screen = useViewStore(screenOf)
  const zoom = useViewStore((state) => currentView(state).zoom)
  const showPage = useDocumentStore((state) => state.showPage)
  const pager = useDocumentStore(
    useShallow((state) => {
      const id = state.selection.at(-1)
      const doc = state.document
      const owner = id ? pageLayoutAround(doc, id) : null
      if (!owner) return null
      const pages = pagesOf(doc, owner)
      const index = pages.indexOf(shownPageOf(doc, owner)!)
      const circular = resolveModifier(
        doc.nodes[owner],
        'UIPageLayout',
      )!.Circular
      const step = (by: number) => {
        const to = index + by
        if (circular) return pages[(to + pages.length) % pages.length]
        return pages[to] ?? null
      }
      const box = visualBox(doc, owner, screen)
      return {
        x: box.x + box.width / 2,
        y: box.y,
        // Hang inside the top edge when there's no room above it (an
        // element at the top of the screen, which clips the overlay).
        inside: box.y * zoom < PAGE_CONTROLS_ROOM,
        page: index + 1,
        count: pages.length,
        previous: step(-1),
        next: step(1),
      }
    }),
  )
  if (!pager) return null
  const arrow =
    'pointer-events-auto rounded-sm px-1 hover:bg-black/15 disabled:opacity-40 disabled:hover:bg-transparent'
  return (
    <ScreenLabel
      side={pager.inside ? 'below' : 'above'}
      x={pager.x}
      y={pager.y}
    >
      {/* Pressing an arrow mustn't reach the canvas, which would take it
          as a click on empty space and clear the selection. */}
      <span
        className="flex items-center gap-1"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Previous page"
          className={arrow}
          disabled={!pager.previous}
          onClick={() => pager.previous && showPage(pager.previous)}
        >
          ‹
        </button>
        Page {pager.page} / {pager.count}
        <button
          type="button"
          aria-label="Next page"
          className={arrow}
          disabled={!pager.next}
          onClick={() => pager.next && showPage(pager.next)}
        >
          ›
        </button>
      </span>
    </ScreenLabel>
  )
}
