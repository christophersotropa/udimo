import { type PointerEvent, useRef, useState } from 'react'
import {
  DEFAULT_PANEL_LAYOUT,
  draggedWidth,
  PANEL_MAX_WIDTH,
  PANEL_MIN_WIDTH,
  SPLIT_MAX,
  SPLIT_MIN,
  type Side,
} from '../../store/panelLayout.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { blockTextSelection } from '../ui/blockTextSelection.ts'

// The draggable edges of the docked panels:
//   PanelResizer: a side's inner edge (next to the canvas), for its width.
//   SplitResizer: the line between two panels stacked on one side, for
//                 how the height is shared.
// Double-click either to reset it. Each can also be focused with Tab and
// moved with the arrow keys (Shift for bigger steps), so it works without
// a mouse. role="separator" is how screen readers know it's a draggable
// divider; aria-valuenow tells them where it is.

// Pointer handling shared by both: press, move (with the pointer captured,
// so the drag keeps going when the pointer runs ahead of the thin strip),
// let go.
function useStripDrag<T>(
  begin: (event: PointerEvent<HTMLElement>) => T,
  move: (start: T, event: PointerEvent<HTMLElement>) => void,
) {
  const start = useRef<{ value: T; unblock: () => void } | null>(null)
  const [dragging, setDragging] = useState(false)
  const stop = () => {
    start.current?.unblock()
    start.current = null
    setDragging(false)
  }
  return {
    dragging,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        start.current = { value: begin(event), unblock: blockTextSelection() }
        setDragging(true)
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (start.current) move(start.current.value, event)
      },
      onPointerUp: stop,
      onLostPointerCapture: stop,
    },
  }
}

// The visible line: shows on hover, while dragging, and on keyboard focus.
function StripLine({
  dragging,
  vertical,
}: {
  dragging: boolean
  vertical: boolean
}) {
  return (
    <div
      className={`transition-colors ${
        vertical ? 'mx-auto h-full w-0.5' : 'my-auto h-0.5 w-full'
      } ${
        dragging
          ? 'bg-accent'
          : 'bg-transparent group-hover:bg-accent/60 group-focus-visible:bg-accent'
      }`}
    />
  )
}

export function PanelResizer({ side }: { side: Side }) {
  const width = useViewStore((state) => state.panels.widths[side])
  const setSideWidth = useViewStore((state) => state.setSideWidth)
  const { dragging, handlers } = useStripDrag(
    (event) => ({ x: event.clientX, width }),
    (start, event) =>
      setSideWidth(
        side,
        draggedWidth(start.width, event.clientX - start.x, side),
      ),
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize the ${side} panels`}
      aria-valuenow={width}
      aria-valuemin={PANEL_MIN_WIDTH}
      aria-valuemax={PANEL_MAX_WIDTH}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      {...handlers}
      onDoubleClick={() =>
        setSideWidth(side, DEFAULT_PANEL_LAYOUT.widths[side])
      }
      onKeyDown={(event) => {
        const step = event.shiftKey ? 40 : 10
        const dx = { ArrowLeft: -step, ArrowRight: step }[event.key]
        if (dx === undefined) return
        event.preventDefault()
        setSideWidth(side, draggedWidth(width, dx, side))
      }}
      // One strip per side, drawn over the workspace (App places it) and
      // as tall as it, so with two panels stacked the whole edge lights up,
      // not just the panel under the pointer. 8px wide to grab easily,
      // centered on the side's border (-translate-x-1/2).
      style={{
        left: side === 'left' ? width : `calc(100% - ${width}px)`,
      }}
      className="group absolute inset-y-0 z-20 flex w-2 -translate-x-1/2 cursor-col-resize touch-none outline-none"
    >
      <StripLine dragging={dragging} vertical />
    </div>
  )
}

export function SplitResizer() {
  const split = useViewStore((state) => state.panels.split)
  const setPanelSplit = useViewStore((state) => state.setPanelSplit)
  const { dragging, handlers } = useStripDrag(
    // The split is a share of the workspace's height, so a drag of dy
    // pixels moves it by dy / height.
    (event) => ({
      y: event.clientY,
      split,
      height:
        event.currentTarget.closest('#workspace')?.clientHeight ??
        window.innerHeight,
    }),
    (start, event) =>
      setPanelSplit(start.split + (event.clientY - start.y) / start.height),
  )

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize the stacked panels"
      aria-valuenow={Math.round(split * 100)}
      aria-valuemin={SPLIT_MIN * 100}
      aria-valuemax={SPLIT_MAX * 100}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      {...handlers}
      onDoubleClick={() => setPanelSplit(DEFAULT_PANEL_LAYOUT.split)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.1 : 0.025
        const dy = { ArrowUp: -step, ArrowDown: step }[event.key]
        if (dy === undefined) return
        event.preventDefault()
        setPanelSplit(split + dy)
      }}
      // On the top panel's bottom border.
      className="group absolute inset-x-0 -bottom-1 z-20 flex h-2 cursor-row-resize touch-none outline-none"
    >
      <StripLine dragging={dragging} vertical={false} />
    </div>
  )
}
