import { type PointerEvent as ReactPointerEvent, useRef } from 'react'
import {
  type Handle,
  type HandleSide,
  type ResizeStart,
  resizeBox,
} from '../../lib/resize.ts'
import { addOffset } from '../../lib/udim2.ts'
import { resolveProps } from '../../model/defaults.ts'
import { topLevelNodes } from '../../model/tree.ts'
import type { NodeId, UDim2 } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'

// How far (in screen pixels) the pointer must move before a click becomes a
// drag, so a slightly shaky click doesn't nudge anything.
const DRAG_THRESHOLD = 3

// What a drag does: move the selection, or resize one element.
// The `kind` field tells them apart: this is called a "discriminated union".
type DragAction =
  | {
      kind: 'move'
      // Where each dragged element was when the drag began.
      startPositions: Map<NodeId, UDim2>
    }
  | {
      kind: 'resize'
      id: NodeId
      handle: Handle
      start: ResizeStart
    }

// A drag in progress: where the pointer started, plus what it's doing.
type Drag = DragAction & {
  pointerId: number
  startX: number
  startY: number
  started: boolean
}

// Click, Shift-click, drag to move, and drag a handle to resize. "Pointer"
// events cover mouse, pen and touch with one API. `scale` is how much the
// screen is shrunk on the canvas, used to turn screen pixels into game pixels.
export function useCanvasPointer(scale: number) {
  // A ref holds the drag in progress without re-rendering on every move.
  const drag = useRef<Drag | null>(null)

  function beginDrag(
    event: ReactPointerEvent<HTMLElement>,
    action: DragAction,
  ) {
    drag.current = {
      ...action,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
    }
    // "Capture" keeps sending this pointer's events to us even if it leaves
    // the canvas, so a fast drag doesn't get lost.
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return // left button only
    const clicked = event.target as Element

    // If a Properties box is mid-edit, finish it now: blurring it saves the
    // typed value to the element it belongs to, before the selection changes.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    // ---- A resize handle? (They sit inside the selected element.)
    const handleEl = clicked.closest<HTMLElement>('[data-handle-x]')
    const handleOwner = handleEl?.closest<HTMLElement>('[data-node-id]')
    if (handleEl && handleOwner?.dataset.nodeId) {
      const id = handleOwner.dataset.nodeId
      const p = resolveProps(useDocumentStore.getState().document.nodes[id])
      beginDrag(event, {
        kind: 'resize',
        id,
        handle: {
          x: Number(handleEl.dataset.handleX) as HandleSide,
          y: Number(handleEl.dataset.handleY) as HandleSide,
        },
        start: {
          size: p.Size,
          position: p.Position,
          anchorPoint: p.AnchorPoint,
          // offsetWidth is the size before the canvas shrink: game pixels.
          pixelWidth: handleOwner.offsetWidth,
          pixelHeight: handleOwner.offsetHeight,
        },
      })
      return
    }

    // ---- An element? Each one carries data-node-id. closest() walks up from
    // what was clicked to the nearest one: the innermost element.
    const id = clicked.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId
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

    const { document: doc, selection } = useDocumentStore.getState()
    if (!selection.includes(id)) return // Shift-click just unselected it

    const startPositions = new Map<NodeId, UDim2>()
    for (const nodeId of topLevelNodes(doc, selection)) {
      // A locked element picked in the Explorer stays put when you drag others.
      if (doc.nodes[nodeId].locked) continue
      startPositions.set(nodeId, resolveProps(doc.nodes[nodeId]).Position)
    }
    beginDrag(event, { kind: 'move', startPositions })
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current
    if (!current || event.pointerId !== current.pointerId || scale === 0) return

    const screenDx = event.clientX - current.startX
    const screenDy = event.clientY - current.startY
    if (!current.started && Math.hypot(screenDx, screenDy) < DRAG_THRESHOLD) {
      return
    }
    const { updateProps, beginGroup } = useDocumentStore.getState()
    if (!current.started) {
      current.started = true
      // The many small moves of one drag become a single undo step.
      beginGroup()
    }

    // Always measure from where the drag began, not from the last move, so
    // rounding to whole pixels never adds up into drift.
    const dx = screenDx / scale
    const dy = screenDy / scale

    if (current.kind === 'move') {
      for (const [id, start] of current.startPositions) {
        updateProps(id, { Position: addOffset(start, dx, dy) })
      }
    } else {
      const { size, position } = resizeBox(
        current.start,
        current.handle,
        dx,
        dy,
      )
      updateProps(current.id, { Size: size, Position: position })
    }
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    if (drag.current.started) useDocumentStore.getState().endGroup()
    drag.current = null
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  }
}
