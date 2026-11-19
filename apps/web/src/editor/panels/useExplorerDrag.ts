import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { autoScrollSpeed } from '../../lib/autoScroll.ts'
import {
  canDrop,
  canHoldChildren,
  type DropPlace,
  dropPlaceAt,
} from '../../model/drop.ts'
import type { NodeId } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { blockTextSelection } from '../ui/blockTextSelection.ts'

// Dragging rows in the Explorer, so it looks like you're moving the row
// itself: it lifts and slides with the pointer, the rows around it slide
// apart to open a gap where it would land (and close the one it left), and
// it shifts sideways to the indent it would land at. Let go and it settles
// into the gap; press Escape (or let go where it can't go) and everything
// slides back.
//
// It's built on pointer events rather than the browser's own drag-and-
// drop, which can only show a see-through picture of the row. Rows are
// moved with CSS transforms (set directly, not through React, so it stays
// smooth); the document only changes once, on the drop.

export type DropTarget = { id: NodeId; place: DropPlace }

// How far the pointer must move before a press becomes a drag, so a plain
// click still just selects.
const DRAG_THRESHOLD = 4
// How long rows take to slide aside, settle or slide back, in ms.
const SLIDE_MS = 150
// Each tree level's indent, in pixels (ExplorerPanel's INDENT).
const INDENT = 12

// One line of the tree as it was when the drag began: a row, or a
// modifier listed under its element. Tops are measured from the list's top.
type Line = {
  el: HTMLElement
  rowId: NodeId | null // null for a modifier line
  ownerId: NodeId // the element a modifier belongs to (or the row itself)
  depth: number
  top: number
  height: number
}

type Session = {
  id: NodeId // the row you grabbed
  row: HTMLElement
  start: { x: number; y: number }
  point: { x: number; y: number }
  grabY: number // the pointer's height inside the row
  started: boolean
  ids: NodeId[] // every row being moved (the selection)
  lines: Line[]
  block: HTMLElement // the grabbed row and everything inside it
  blockFrom: number // index of its first line
  blockTo: number // one past its last line
  blockTop: number
  blockHeight: number
  target: DropTarget | null
  unblock: () => void
  frame: number
  cleanup: () => void
}

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useExplorerDrag(onDrop: (target: DropTarget) => void) {
  // The grabbed row and how many rows move with it (for its "+2" badge).
  const [lifted, setLifted] = useState<{ id: NodeId; count: number } | null>(
    null,
  )
  // Other selected rows moving along, which dim in place.
  const [dragIds, setDragIds] = useState<ReadonlySet<NodeId>>(new Set())
  // A row the rows would go inside, which lights up.
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  // The press in progress. A ref: it changes on every pointer move, and
  // React needn't redraw for that.
  const session = useRef<Session | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Stop everything if the Explorer goes away mid-drag.
  useEffect(
    () => () => {
      session.current?.cleanup()
      clearTimeout(timer.current)
    },
    [],
  )

  const listTop = () => listRef.current?.getBoundingClientRect().top ?? 0

  // Every line of the tree, in order, measured.
  function measureLines(): Line[] {
    const list = listRef.current
    if (!list) return []
    const top = list.getBoundingClientRect().top
    return [...list.querySelectorAll<HTMLElement>('[data-tree-line]')].map(
      (el) => {
        const box = el.getBoundingClientRect()
        return {
          el,
          rowId: el.dataset.rowId ?? null,
          ownerId: (el.dataset.rowId ?? el.dataset.ownerId)!,
          depth: Number(el.dataset.depth),
          top: box.top - top,
          height: box.height,
        }
      },
    )
  }

  // Where a line sits with the grabbed block taken out (lines below it
  // move up to close its gap).
  function closedTop(s: Session, i: number): number {
    return i >= s.blockTo ? s.lines[i].top - s.blockHeight : s.lines[i].top
  }

  // What the pointer is over, with the block taken out, and whether the
  // rows may go there.
  function findTarget(s: Session): DropTarget | null {
    const doc = useDocumentStore.getState().document
    const y = s.point.y - listTop()
    const others = s.lines
      .map((line, i) => ({ line, i }))
      .filter(({ i }) => i < s.blockFrom || i >= s.blockTo)
    if (others.length === 0) return null
    // The line under the pointer, or the nearest end of the list.
    const hit =
      others.find(({ line, i }) => y < closedTop(s, i) + line.height) ??
      others[others.length - 1]
    const { line, i } = hit
    let target: DropTarget
    if (line.rowId === null) {
      // A modifier line is part of its element's block: it means inside
      // the element if that can hold children, otherwise just below it.
      target = {
        id: line.ownerId,
        place: canHoldChildren(doc, line.ownerId) ? 'inside' : 'after',
      }
    } else if (doc.nodes[line.rowId]?.parentId === null) {
      target = { id: line.rowId, place: 'inside' } // the ScreenGui
    } else {
      const fraction = (y - closedTop(s, i)) / line.height
      target = {
        id: line.rowId,
        place: dropPlaceAt(
          Math.min(1, Math.max(0, fraction)),
          canHoldChildren(doc, line.rowId),
        ),
      }
    }
    return canDrop(doc, s.ids, target.id, target.place) ? target : null
  }

  // Where the gap opens (in "closed" positions) for a target, and the
  // indent the rows would land at.
  function gapFor(s: Session, target: DropTarget) {
    const i = s.lines.findIndex((line) => line.rowId === target.id)
    const line = s.lines[i]
    if (target.place === 'before') {
      return { y: closedTop(s, i), depth: line.depth }
    }
    // After a row, or inside it as its last child: below everything
    // that's inside it.
    const subtree = line.el.closest('li')!
    let last = i
    s.lines.forEach((other, j) => {
      const inBlock = j >= s.blockFrom && j < s.blockTo
      if (!inBlock && subtree.contains(other.el)) last = j
    })
    return {
      y: closedTop(s, last) + s.lines[last].height,
      depth: target.place === 'inside' ? line.depth + 1 : line.depth,
    }
  }

  // Moves everything to match the pointer: the block follows it, the
  // other lines slide to open the gap.
  function layout(s: Session) {
    const target = findTarget(s)
    s.target = target
    setDropTarget((was) =>
      was?.id === target?.id && was?.place === target?.place ? was : target,
    )

    // The block: its top follows the pointer; sideways, the landing indent.
    const blockY = s.point.y - listTop() - s.grabY - s.blockTop
    s.block.style.transform = `translateY(${blockY}px)`
    const gap = target ? gapFor(s, target) : null
    const depth = s.lines[s.blockFrom].depth
    s.block.style.translate = `${gap ? (gap.depth - depth) * INDENT : 0}px 0`

    // Everyone else. Somewhere it can't go: everything stays put, so the
    // gap stays where the block came from.
    s.lines.forEach((line, i) => {
      if (i >= s.blockFrom && i < s.blockTo) return
      let shift = 0
      if (gap) {
        const closed = closedTop(s, i)
        shift = closed - line.top + (closed >= gap.y - 0.5 ? s.blockHeight : 0)
      }
      line.el.style.transform = shift ? `translateY(${shift}px)` : ''
    })
  }

  // Once per frame while dragging: scroll the list if the pointer is near
  // its top or bottom edge.
  function tick() {
    const s = session.current
    if (!s?.started) return
    const scroller = listRef.current?.closest<HTMLElement>('[data-scroll-area]')
    if (scroller) {
      const box = scroller.getBoundingClientRect()
      const speed = autoScrollSpeed(s.point.y, box.top, box.bottom)
      if (speed !== 0) {
        scroller.scrollTop += speed
        layout(s)
      }
    }
    s.frame = requestAnimationFrame(tick)
  }

  function begin(s: Session) {
    const store = useDocumentStore.getState()
    // Dragging a selected row drags the whole selection. Dragging any other
    // row selects it first, so it's clear what's moving.
    if (!store.selection.includes(s.id)) store.select(s.id)
    s.ids = useDocumentStore.getState().selection
    s.lines = measureLines()
    s.block = s.row.closest('li')!
    s.blockFrom = s.lines.findIndex((line) => s.block.contains(line.el))
    s.blockTo = s.blockFrom
    while (
      s.blockTo < s.lines.length &&
      s.block.contains(s.lines[s.blockTo].el)
    ) {
      s.blockTo++
    }
    s.blockTop = s.lines[s.blockFrom].top
    const last = s.lines[s.blockTo - 1]
    s.blockHeight = last.top + last.height - s.blockTop
    s.grabY = s.point.y - listTop() - s.blockTop
    s.started = true
    s.unblock = blockTextSelection()

    // The other lines slide; the block itself follows the pointer exactly,
    // and only its sideways indent shift is eased.
    const slide = reduceMotion() ? '' : `transform ${SLIDE_MS}ms ease`
    s.lines.forEach((line) => (line.el.style.transition = slide))
    s.block.style.transition = reduceMotion()
      ? ''
      : `translate ${SLIDE_MS}ms ease`
    s.block.classList.add('explorer-lifted')

    clearTimeout(timer.current)
    setLifted({ id: s.id, count: s.ids.length })
    setDragIds(new Set(s.ids.filter((id) => id !== s.id)))
    s.frame = requestAnimationFrame(tick)
  }

  // Clears every style the drag set, once things have finished sliding.
  function tidyUp(elements: HTMLElement[]) {
    for (const el of elements) {
      el.style.transform = ''
      el.style.translate = ''
      el.style.transition = ''
      el.classList.remove('explorer-lifted')
    }
  }

  function finish(drop: boolean) {
    const s = session.current
    if (!s) return
    s.cleanup()
    session.current = null
    if (!s.started) return
    s.unblock()
    cancelAnimationFrame(s.frame)
    setDropTarget(null)
    setDragIds(new Set())
    const all = [...s.lines.map((line) => line.el), s.block]
    const target = drop ? s.target : null

    if (!target) {
      // Slide everything back where it was.
      s.block.style.transition = reduceMotion()
        ? ''
        : `transform ${SLIDE_MS}ms ease, translate ${SLIDE_MS}ms ease`
      s.lines.forEach((line) => (line.el.style.transform = ''))
      s.block.style.transform = ''
      s.block.style.translate = ''
      timer.current = setTimeout(() => {
        tidyUp(all)
        setLifted(null)
      }, SLIDE_MS)
      return
    }

    // Where the block is on screen right now, before the move.
    const before = s.block.getBoundingClientRect().top
    // Make the move. The rows are already drawn where the move puts them
    // (that's what the gap was), so the styles can go at once with no jump.
    for (const el of all) el.style.transition = 'none'
    tidyUp(all)
    onDrop(target)
    // Then settle: React has redrawn the tree by the next frame. The moved
    // row is put back where it was let go (a transform) and eased into its
    // new place, so it glides the last few pixels instead of snapping.
    requestAnimationFrame(() => {
      const row = listRef.current?.querySelector<HTMLElement>(
        `[data-row-id="${CSS.escape(s.id)}"]`,
      )
      const block = row?.closest('li')
      if (!block || reduceMotion()) {
        setLifted(null)
        return
      }
      const after = block.getBoundingClientRect().top
      block.classList.add('explorer-lifted')
      block.style.transition = 'none'
      block.style.transform = `translateY(${before - after}px)`
      requestAnimationFrame(() => {
        block.style.transition = `transform ${SLIDE_MS}ms ease`
        block.style.transform = ''
        timer.current = setTimeout(() => {
          tidyUp([block])
          setLifted(null)
        }, SLIDE_MS)
      })
    })
  }

  // A press on a row: watch the pointer, and start a drag once it moves.
  function onRowPointerDown(event: ReactPointerEvent<HTMLElement>, id: NodeId) {
    if (event.button !== 0 || session.current) return
    // The row's own buttons (fold, insert, show, unlock) and the rename
    // box keep working as normal.
    if ((event.target as Element).closest('[data-no-drag]')) return

    const onMove = (e: PointerEvent) => {
      const s = session.current
      if (!s) return
      s.point = { x: e.clientX, y: e.clientY }
      if (!s.started) {
        const moved = Math.hypot(e.clientX - s.start.x, e.clientY - s.start.y)
        if (moved < DRAG_THRESHOLD) return
        begin(s)
      }
      layout(s)
    }
    const onUp = () => finish(true)
    const onCancel = () => finish(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && session.current?.started) {
        e.preventDefault()
        finish(false)
      }
    }
    // On the window, so the drag follows the pointer anywhere on the page.
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey)

    const start = { x: event.clientX, y: event.clientY }
    session.current = {
      id,
      row: event.currentTarget,
      start,
      point: start,
      grabY: 0,
      started: false,
      ids: [],
      lines: [],
      block: event.currentTarget,
      blockFrom: 0,
      blockTo: 0,
      blockTop: 0,
      blockHeight: 0,
      target: null,
      unblock: () => {},
      frame: 0,
      cleanup: () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        window.removeEventListener('keydown', onKey)
      },
    }
  }

  return { listRef, lifted, dragIds, dropTarget, onRowPointerDown }
}
