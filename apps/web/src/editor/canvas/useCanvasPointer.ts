import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  type Handle,
  type HandleSide,
  type ResizeStart,
  resizeBox,
} from '../../lib/resize.ts'
import { addOffset } from '../../lib/udim2.ts'
import { resolveProps } from '../../model/defaults.ts'
import { isLaidOut } from '../../model/layout.ts'
import { topLevelNodes } from '../../model/tree.ts'
import type { NodeId, UDim2 } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import {
  type Guide,
  type SnapContext,
  snapContext,
  snapMove,
  snapResize,
} from '../../model/snap.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'

// How far (in screen pixels) the pointer must move before a click becomes a
// drag, so a slightly shaky click doesn't nudge anything.
const DRAG_THRESHOLD = 3

// How close (in screen pixels) an edge must come to a line to snap to it.
// Divided by the zoom, so it feels the same at every zoom.
const SNAP_DISTANCE = 6

// Guides are worked out relative to the parent's content area; the overlay
// draws them relative to the whole screen.
function onScreen(guides: Guide[], origin: { x: number; y: number }): Guide[] {
  return guides.map((guide) => {
    const [along, across] =
      guide.axis === 'x' ? [origin.x, origin.y] : [origin.y, origin.x]
    return {
      ...guide,
      position: guide.position + along,
      from: guide.from + across,
      to: guide.to + across,
    }
  })
}

// What a drag does: move the selection, resize one element, or pan the view.
// The `kind` field tells them apart: this is called a "discriminated union".
type DragAction =
  | {
      kind: 'move'
      // Where each dragged element was when the drag began.
      startPositions: Map<NodeId, UDim2>
      // What to snap to (null if the elements have different parents).
      snap: SnapContext | null
    }
  | {
      kind: 'resize'
      id: NodeId
      handle: Handle
      start: ResizeStart
      snap: SnapContext | null
    }
  | {
      kind: 'pan'
      // Where the pointer was at the last move. Panning isn't undone and
      // isn't rounded, so it can simply follow each move.
      lastX: number
      lastY: number
    }

// A drag in progress: where the pointer started, plus what it's doing.
type Drag = DragAction & {
  pointerId: number
  startX: number
  startY: number
  started: boolean
}

// Click, Shift-click, drag to move, drag a handle to resize, and pan with
// the middle button or Space + drag. "Pointer" events cover mouse, pen and
// touch with one API. `scale` is the canvas zoom, used to turn screen pixels
// into game pixels. Also returns the cursor to show.
export function useCanvasPointer(scale: number) {
  // A ref holds the drag in progress without re-rendering on every move.
  const drag = useRef<Drag | null>(null)
  // Space held down (for Space + drag panning), and whether the pointer is
  // over the canvas. Refs, so the event handlers always see the latest.
  const spaceHeld = useRef(false)
  const overCanvas = useRef(false)
  // The same two facts as state, just to pick the cursor.
  const [spaceDown, setSpaceDown] = useState(false)
  const [panning, setPanning] = useState(false)
  const handTool = useViewStore((state) => state.tool === 'hand')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) {
        return // typing a space
      }
      // Over the canvas, Space means "pan", not "press the focused button".
      if (overCanvas.current) event.preventDefault()
      spaceHeld.current = true
      setSpaceDown(true)
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      spaceHeld.current = false
      setSpaceDown(false)
    }
    // Switching windows while holding Space never sends the keyup.
    function onBlur() {
      spaceHeld.current = false
      setSpaceDown(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

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
    // ---- Pan: the middle button, or the left button with Space held or
    // the hand tool chosen.
    if (
      event.button === 1 ||
      (event.button === 0 &&
        (spaceHeld.current || useViewStore.getState().tool === 'hand'))
    ) {
      event.preventDefault() // stops the browser's middle-click scrolling
      beginDrag(event, {
        kind: 'pan',
        lastX: event.clientX,
        lastY: event.clientY,
      })
      setPanning(true)
      return
    }
    if (event.button !== 0) return // otherwise, left button only
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
      const doc = useDocumentStore.getState().document
      const p = resolveProps(doc.nodes[id])
      beginDrag(event, {
        kind: 'resize',
        id,
        snap: snapContext(doc, [id], screenOf(useViewStore.getState())),
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
      // A layout ignores Position, so dragging would only make invisible,
      // confusing edits. Reorder laid-out children in the Explorer instead.
      if (isLaidOut(doc, nodeId)) continue
      startPositions.set(nodeId, resolveProps(doc.nodes[nodeId]).Position)
    }
    beginDrag(event, {
      kind: 'move',
      startPositions,
      snap: snapContext(
        doc,
        [...startPositions.keys()],
        screenOf(useViewStore.getState()),
      ),
    })
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current
    if (!current || event.pointerId !== current.pointerId || scale === 0) return

    if (current.kind === 'pan') {
      useViewStore
        .getState()
        .panBy(event.clientX - current.lastX, event.clientY - current.lastY)
      current.lastX = event.clientX
      current.lastY = event.clientY
      return
    }

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
    let dx = screenDx / scale
    let dy = screenDy / scale

    // Snap, unless Cmd/Ctrl is held to place freely.
    const snap = event.metaKey || event.ctrlKey ? null : current.snap
    const { setGuides } = useViewStore.getState()
    const threshold = SNAP_DISTANCE / scale

    if (current.kind === 'move') {
      if (snap) {
        const { start } = snap
        const where = { ...start, x: start.x + dx, y: start.y + dy }
        const snapped = snapMove(where, snap.targets, threshold)
        dx += snapped.dx
        dy += snapped.dy
        setGuides(onScreen(snapped.guides, snap.origin))
      } else {
        setGuides([])
      }
      for (const [id, start] of current.startPositions) {
        updateProps(id, { Position: addOffset(start, dx, dy) })
      }
    } else {
      if (snap) {
        // Where the box would be with the dragged edges moved by (dx, dy).
        const { start } = snap
        const { x: sideX, y: sideY } = current.handle
        const where = {
          x: sideX === -1 ? start.x + dx : start.x,
          y: sideY === -1 ? start.y + dy : start.y,
          width: start.width + sideX * dx,
          height: start.height + sideY * dy,
        }
        const snapped = snapResize(
          where,
          current.handle,
          snap.targets,
          threshold,
        )
        dx += snapped.dx
        dy += snapped.dy
        setGuides(onScreen(snapped.guides, snap.origin))
      } else {
        setGuides([])
      }
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
    if (drag.current.kind === 'pan') setPanning(false)
    useViewStore.getState().setGuides([]) // guides only show mid-drag
    drag.current = null
  }

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onPointerEnter: () => {
        overCanvas.current = true
      },
      onPointerLeave: () => {
        overCanvas.current = false
      },
    },
    // A hand while Space is held or the hand tool is on, a closed hand
    // while panning.
    cursor: panning ? 'grabbing' : spaceDown || handTool ? 'grab' : undefined,
  }
}
