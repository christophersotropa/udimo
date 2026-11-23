import { useShallow } from 'zustand/react/shallow'
import { resolveProps } from '../../model/defaults.ts'
import { visualBox } from '../../model/layout.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'
import { ScreenLabel } from './ScreenLabel.tsx'

// Everything drawn on top of the design while you work: alignment guides
// (with labels) and the selected element's size. It covers the whole screen, above every element, and
// lets clicks through.
export function CanvasOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1000000]">
      <SnapGuides />
      <SizeBadge />
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
