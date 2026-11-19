import { useShallow } from 'zustand/react/shallow'
import { formatNumber } from '../../lib/numbers.ts'
import { resolveProps } from '../../model/defaults.ts'
import { absoluteBox } from '../../model/layout.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'
import { ScreenLabel } from './ScreenLabel.tsx'

// Everything drawn on top of the design while you work: alignment guides
// (with labels), the box being drawn with a draw tool, and the selected
// element's Size. It covers the whole screen, above every element, and
// lets clicks through.
export function CanvasOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1000000]">
      <SnapGuides />
      <DrawPreview />
      <SizeBadge />
    </div>
  )
}

const THIN = 'calc(1px / var(--canvas-scale))' // 1 screen pixel at any zoom

// The pink alignment lines shown while a drag snaps, and their labels
// ("Centered in Window").
function SnapGuides() {
  const guides = useViewStore((state) => state.guides)
  return guides.map((guide, i) => (
    <div key={i}>
      <div
        className="absolute bg-pink-500"
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

// The dashed box while drawing with a draw tool, with its size.
function DrawPreview() {
  const box = useViewStore((state) => state.drawBox)
  if (!box) return null
  return (
    <>
      <div
        className="absolute border-accent bg-accent-soft"
        style={{
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          borderWidth: THIN,
          borderStyle: 'dashed',
        }}
      />
      <ScreenLabel
        side="belowLeft"
        x={box.x + box.width}
        y={box.y + box.height}
      >
        {Math.round(box.width)} × {Math.round(box.height)}
      </ScreenLabel>
    </>
  )
}

// The selected element's Size, as Roblox writes it ({Scale, Offset} for X,
// then Y), under its bottom-right corner.
function SizeBadge() {
  const screen = useViewStore(screenOf)
  const drawing = useViewStore((state) => state.drawBox !== null)
  const badge = useDocumentStore(
    useShallow((state) => {
      if (state.selection.length !== 1) return null
      const id = state.selection[0]
      const node = state.document.nodes[id]
      if (!node || !resolveProps(node).Visible) return null
      const box = absoluteBox(state.document, id, screen)
      const { Size } = resolveProps(node)
      return {
        x: box.x + box.width,
        y: box.y + box.height,
        text: `{${formatNumber(Size.xs)}, ${formatNumber(Size.xo)}}, {${formatNumber(Size.ys)}, ${formatNumber(Size.yo)}}`,
      }
    }),
  )
  if (!badge || drawing) return null
  return (
    <ScreenLabel side="belowLeft" x={badge.x} y={badge.y}>
      {badge.text}
    </ScreenLabel>
  )
}
