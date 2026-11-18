import { type PointerEvent as ReactPointerEvent, useRef } from 'react'
import { addOffset } from '../../lib/udim2.ts'
import { resolveProps } from '../../model/defaults.ts'
import { topLevelNodes } from '../../model/tree.ts'
import type { NodeId, UDim2 } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'

// How far (in screen pixels) the pointer must move before a click becomes a
// drag, so a slightly shaky click doesn't nudge anything.
const DRAG_THRESHOLD = 3

type Drag = {
  pointerId: number
  startX: number
  startY: number
  // Where each dragged element was when the drag began.
  startPositions: Map<NodeId, UDim2>
  started: boolean
}

// Click, Shift-click and drag on the canvas. "Pointer" events cover mouse,
// pen and touch with one API. `scale` is how much the screen is shrunk on
// the canvas, used to turn screen pixels back into game pixels.
export function useCanvasPointer(scale: number) {
  // A ref holds the drag in progress without re-rendering on every move.
  const drag = useRef<Drag | null>(null)

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return // left button only

    // Each element on the canvas carries data-node-id. closest() walks up
    // from what was clicked to the nearest one: the innermost element.
    const target = (event.target as Element).closest<HTMLElement>(
      '[data-node-id]',
    )
    const id = target?.dataset.nodeId
    const store = useDocumentStore.getState()

    if (!id) {
      if (!event.shiftKey) store.clearSelection() // clicked empty space
      return
    }

    if (event.shiftKey) {
      store.select(id, true)
    } else if (!store.selection.includes(id)) {
      // Clicking an already-selected element keeps the selection, so you can
      // drag several elements at once.
      store.select(id)
    }

    const { document, selection } = useDocumentStore.getState()
    if (!selection.includes(id)) return // Shift-click just unselected it

    const startPositions = new Map<NodeId, UDim2>()
    for (const nodeId of topLevelNodes(document, selection)) {
      startPositions.set(nodeId, resolveProps(document.nodes[nodeId]).Position)
    }
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPositions,
      started: false,
    }
    // "Capture" keeps sending this pointer's events to us even if it leaves
    // the canvas, so a fast drag doesn't get lost.
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current
    if (!current || event.pointerId !== current.pointerId || scale === 0) return

    const screenDx = event.clientX - current.startX
    const screenDy = event.clientY - current.startY
    if (!current.started && Math.hypot(screenDx, screenDy) < DRAG_THRESHOLD) {
      return
    }
    current.started = true

    // Always measure from where the drag began, not from the last move, so
    // rounding to whole pixels never adds up into drift.
    const { updateProps } = useDocumentStore.getState()
    for (const [id, start] of current.startPositions) {
      updateProps(id, {
        Position: addOffset(start, screenDx / scale, screenDy / scale),
      })
    }
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  }
}
