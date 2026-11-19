import {
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { resolveProps } from '../../model/defaults.ts'
import {
  canDrop,
  canHoldChildren,
  type DropPlace,
  dropPlaceAt,
} from '../../model/drop.ts'
import { ancestorIds } from '../../model/tree.ts'
import type { NodeId } from '../../model/types.ts'
import {
  moveNodesTo,
  toggleLocked,
  toggleVisible,
} from '../../store/commands.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import {
  ChevronIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
} from './icons.tsx'
import { Panel } from './Panel.tsx'

// How far each level of the tree is indented, in pixels.
const INDENT = 12

type DropTarget = { id: NodeId; place: DropPlace }

// What every row needs from the panel: folding, and dragging rows around.
// Bundled into one object so it can be handed down the tree as one prop.
type TreeControls = {
  collapsed: ReadonlySet<NodeId>
  toggleOpen: (id: NodeId) => void
  // Where the dragged rows would land right now, to draw the marker.
  dropTarget: DropTarget | null
  startDrag: (ids: NodeId[]) => void
  // Returns whether the dragged rows may be dropped there.
  dragOver: (target: DropTarget) => boolean
  drop: (target: DropTarget) => void
  endDrag: () => void
}

// The instance tree, like Roblox Studio's Explorer: ScreenGui > Frame > ...
// Children are listed in document order, the same order as the export.
// Drag rows to reorder them or move them into another Frame.
export function ExplorerPanel() {
  const rootId = useDocumentStore((state) => state.document.rootId)
  const selection = useDocumentStore((state) => state.selection)
  // Ids of the rows you've folded shut. Only this panel cares about it, so
  // it's React state here, not in the store (and it's never undone or saved).
  const [collapsed, setCollapsed] = useState<ReadonlySet<NodeId>>(new Set())
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  // The rows being dragged. A ref, because changing it shouldn't redraw
  // anything: only the drop marker (dropTarget) is drawn.
  const dragIds = useRef<NodeId[]>([])

  // When the selection changes (say, a click on the canvas) and a selected
  // element sits inside a folded row, unfold its parents so you can see it.
  // This runs during render, by remembering the last selection we saw:
  // React's recommended way to adjust state when an input changes (see
  // "You Might Not Need an Effect" in the React docs).
  const [seenSelection, setSeenSelection] = useState(selection)
  if (selection !== seenSelection) {
    setSeenSelection(selection)
    const doc = useDocumentStore.getState().document
    const toOpen = selection.flatMap((id) => ancestorIds(doc, id))
    if (toOpen.some((id) => collapsed.has(id))) {
      setCollapsed(new Set([...collapsed].filter((id) => !toOpen.includes(id))))
    }
  }

  function toggleOpen(id: NodeId) {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tree: TreeControls = {
    collapsed,
    toggleOpen,
    dropTarget,

    startDrag: (ids) => {
      dragIds.current = ids
    },

    dragOver: (target) => {
      const doc = useDocumentStore.getState().document
      const allowed = canDrop(doc, dragIds.current, target.id, target.place)
      const next = allowed ? target : null
      // dragover fires many times a second while the pointer moves. Keeping
      // the old object when nothing changed means React skips the redraw.
      setDropTarget((previous) =>
        previous?.id === next?.id && previous?.place === next?.place
          ? previous
          : next,
      )
      return allowed
    },

    drop: (target) => {
      const moved = moveNodesTo(
        useDocumentStore,
        dragIds.current,
        target.id,
        target.place,
      )
      // Unfold the row you dropped into, so you can see where things went.
      if (moved && target.place === 'inside') {
        setCollapsed((previous) =>
          previous.has(target.id)
            ? new Set([...previous].filter((id) => id !== target.id))
            : previous,
        )
      }
      tree.endDrag()
    },

    endDrag: () => {
      dragIds.current = []
      setDropTarget(null)
    },
  }

  // Leaving the whole tree (not just moving from one row to the next)
  // removes the marker. relatedTarget is where the pointer went.
  function onDragLeave(event: ReactDragEvent) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropTarget(null)
    }
  }

  return (
    <Panel title="Explorer" side="left">
      <ul onDragLeave={onDragLeave}>
        <TreeRow id={rootId} depth={0} parentHidden={false} tree={tree} />
      </ul>
    </Panel>
  )
}

type TreeRowProps = {
  id: NodeId
  depth: number
  // True if some element above this one is hidden, which hides this one too.
  parentHidden: boolean
  tree: TreeControls
}

// One row, then the rows of its children inside it: recursive, like the
// canvas's NodeView. Each row reads only its own node from the store.
function TreeRow({ id, depth, parentHidden, tree }: TreeRowProps) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  const isSelected = useDocumentStore((state) => state.selection.includes(id))
  const [renaming, setRenaming] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  // Scroll the selected row into view, e.g. after clicking its element on
  // the canvas. 'nearest' means: don't scroll at all if it's already visible.
  useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isSelected])

  if (!node) return null

  const isRoot = node.parentId === null
  const ownHidden = !resolveProps(node).Visible
  const hidden = parentHidden || ownHidden
  const hasChildren = node.children.length > 0
  const open = !tree.collapsed.has(id)
  const dropPlace = tree.dropTarget?.id === id ? tree.dropTarget.place : null

  function onSelect(event: ReactMouseEvent) {
    const store = useDocumentStore.getState()
    // The ScreenGui is the whole screen, not something you can select.
    if (isRoot) store.clearSelection()
    else store.select(id, event.shiftKey)
  }

  function finishRename(newName: string | null) {
    setRenaming(false)
    // null means cancelled. An empty name would be hard to find in Studio,
    // so it keeps the old name instead.
    if (newName !== null && newName.trim() !== '') {
      useDocumentStore.getState().renameNode(id, newName)
    }
  }

  // ---- Dragging. These are the browser's built-in drag-and-drop events:
  // dragstart on the row you pick up, dragover on each row you pass over,
  // drop on the row you let go on, dragend on the picked-up row at the end.

  function onDragStart(event: ReactDragEvent) {
    const store = useDocumentStore.getState()
    // Dragging a selected row drags the whole selection. Dragging any other
    // row selects it first, so it's clear what's moving.
    if (!store.selection.includes(id)) store.select(id)
    event.dataTransfer.effectAllowed = 'move'
    // Some browsers (Firefox) only start a drag if some data is attached.
    event.dataTransfer.setData('text/plain', node.name)
    tree.startDrag(useDocumentStore.getState().selection)
  }

  // Which place the pointer means: above, inside or below this row.
  function targetAt(event: ReactDragEvent): DropTarget {
    if (isRoot) return { id, place: 'inside' }
    const box = event.currentTarget.getBoundingClientRect()
    const fraction = (event.clientY - box.top) / box.height
    const doc = useDocumentStore.getState().document
    return { id, place: dropPlaceAt(fraction, canHoldChildren(doc, id)) }
  }

  function onDragOver(event: ReactDragEvent) {
    // By default the browser refuses drops. preventDefault() says "you may
    // drop here", so we only call it when the drop is allowed.
    if (tree.dragOver(targetAt(event))) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }
  }

  function onDrop(event: ReactDragEvent) {
    event.preventDefault()
    tree.drop(targetAt(event))
  }

  return (
    <li>
      <div
        ref={rowRef}
        draggable={!isRoot && !renaming}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={tree.endDrag}
        style={{ paddingLeft: depth * INDENT }}
        className={`group relative flex items-center gap-1 rounded pr-1 ${
          dropPlace === 'inside'
            ? 'bg-blue-500/20 ring-1 ring-blue-500'
            : isSelected
              ? 'bg-blue-600/30'
              : 'hover:bg-zinc-800'
        }`}
      >
        {/* The marker line for "drop above" or "drop below" this row,
            indented to show which level the rows will land on. */}
        {(dropPlace === 'before' || dropPlace === 'after') && (
          <span
            className={`pointer-events-none absolute right-0 h-0.5 rounded bg-blue-500 ${
              dropPlace === 'before' ? '-top-px' : '-bottom-px'
            }`}
            style={{ left: depth * INDENT }}
          />
        )}

        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => tree.toggleOpen(id)}
            className="shrink-0 rounded text-zinc-500 hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <ChevronIcon className={open ? 'rotate-90' : undefined} />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" /> // keeps names lined up
        )}

        {renaming ? (
          <RenameInput name={node.name} onDone={finishRename} />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            onDoubleClick={() => setRenaming(true)}
            title="Double-click to rename, drag to move"
            className={`flex min-w-0 flex-1 items-baseline gap-1.5 py-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-blue-500 ${
              hidden ? 'text-zinc-500' : 'text-zinc-100'
            }`}
          >
            <span className="truncate">{node.name}</span>
            <span className="shrink-0 text-[11px] text-zinc-500">
              {node.className}
            </span>
          </button>
        )}

        {/* The ScreenGui has no Visible property and can't be dragged. */}
        {!isRoot && (
          <>
            <RowToggle
              active={ownHidden}
              label={ownHidden ? 'Show' : 'Hide'}
              onClick={() => toggleVisible(useDocumentStore, id)}
            >
              {ownHidden ? <EyeOffIcon /> : <EyeIcon />}
            </RowToggle>
            <RowToggle
              active={node.locked === true}
              label={node.locked ? 'Unlock' : 'Lock'}
              onClick={() => toggleLocked(useDocumentStore, id)}
            >
              {node.locked ? <LockIcon /> : <UnlockIcon />}
            </RowToggle>
          </>
        )}
      </div>

      {hasChildren && open && (
        <ul>
          {node.children.map((childId) => (
            <TreeRow
              key={childId}
              id={childId}
              depth={depth + 1}
              parentHidden={hidden}
              tree={tree}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// The eye and lock buttons. They only show when you hover the row, unless
// they're switched on: then they stay, so you can spot hidden or locked rows.
function RowToggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`shrink-0 rounded p-0.5 text-zinc-400 hover:text-zinc-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-500 ${
        active ? '' : 'opacity-0 group-hover:opacity-100'
      }`}
    >
      {children}
    </button>
  )
}

// The text box that replaces a name while you rename it.
// Enter or clicking away saves; Escape cancels.
function RenameInput({
  name,
  onDone,
}: {
  name: string
  onDone: (newName: string | null) => void
}) {
  const [draft, setDraft] = useState(name)
  // A ref, not state: it must be readable in onBlur right away, before
  // React has re-rendered.
  const cancelled = useRef(false)

  return (
    <input
      autoFocus // it only appears because you asked to rename
      aria-label="Name"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.target.select()} // select all, ready to type over
      onBlur={() => onDone(cancelled.current ? null : draft)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          cancelled.current = true
          event.currentTarget.blur()
        }
      }}
      className="min-w-0 flex-1 rounded bg-zinc-950 px-1 py-0.5 text-sm text-zinc-100 outline-1 outline-blue-500"
    />
  )
}
