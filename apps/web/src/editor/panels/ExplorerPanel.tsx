import {
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
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
import { ancestorIds, filterTree } from '../../model/tree.ts'
import { MODIFIER_CLASSES } from '../../model/modifiers.ts'
import type { ModifierClass, NodeId } from '../../model/types.ts'
import {
  moveNodesTo,
  toggleLocked,
  toggleVisible,
} from '../../store/commands.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { openMenuFor } from '../menus/openMenu.ts'
import { IconButton } from '../ui/Button.tsx'
import { ClassIcon } from './ClassIcon.tsx'
import {
  ChevronIcon,
  CollapseIcon,
  EyeOffIcon,
  LockIcon,
  PlusIcon,
} from './icons.tsx'
import { Panel } from './Panel.tsx'

// How far each level of the tree is indented, in pixels.
const INDENT = 12

type DropTarget = { id: NodeId; place: DropPlace }

// What every row needs from the panel: folding, filtering, and dragging
// rows around. Bundled into one object so it's handed down as one prop.
type TreeControls = {
  collapsed: ReadonlySet<NodeId>
  // While filtering: the rows to show (matches and their parents), all
  // unfolded. null when not filtering.
  filter: Set<NodeId> | null
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
  const [query, setQuery] = useState('')
  // Only read the whole document while filtering: otherwise every edit
  // would redraw the whole tree.
  const filterDoc = useDocumentStore((state) => (query ? state.document : null))
  const filter = useMemo(
    () => (filterDoc ? filterTree(filterDoc, query) : null),
    [filterDoc, query],
  )
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
    filter,
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

  // Folds every row shut except the ScreenGui, so you see the top level.
  function collapseAll() {
    const doc = useDocumentStore.getState().document
    setCollapsed(
      new Set(
        Object.values(doc.nodes)
          .filter((node) => node.parentId !== null)
          .map((node) => node.id),
      ),
    )
  }

  // The header's "+": insert into the selected element, or the ScreenGui.
  function insertFromHeader(event: ReactMouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const target = selection.length === 1 ? selection[0] : rootId
    openMenuFor(target, box.left, box.bottom + 4, true)
  }

  return (
    <Panel
      title="Explorer"
      side="left"
      actions={
        <div className="flex">
          <IconButton
            label="Insert an object"
            onClick={insertFromHeader}
            className="size-6"
          >
            <PlusIcon />
          </IconButton>
          <IconButton
            label="Collapse all"
            onClick={collapseAll}
            className="size-6"
          >
            <CollapseIcon />
          </IconButton>
        </div>
      }
    >
      <div className="mb-1.5">
        <input
          id="explorer-filter" // ⌘⇧X focuses it (see useKeyboardShortcuts)
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter (⌘⇧X)"
          aria-label="Filter the Explorer"
          className="h-7 w-full rounded bg-app px-2 text-[13px] text-ink ring-1 ring-line outline-none placeholder:text-faint focus:ring-accent"
        />
      </div>
      {filter?.size === 0 && (
        <p className="px-1 text-sm text-muted">Nothing called “{query}”.</p>
      )}
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
  // Renaming is asked for in the view store (by double-click, F2 or the
  // right-click menu), so anything can start it; the row just follows.
  const renaming = useViewStore((state) => state.renamingId === id)
  const setRenamingId = useViewStore((state) => state.setRenamingId)
  const rowRef = useRef<HTMLDivElement>(null)

  // Scroll the selected row into view, e.g. after clicking its element on
  // the canvas. 'nearest' means: don't scroll at all if it's already visible.
  useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isSelected])

  if (!node) return null
  // While filtering, rows that don't match (and hold no match) are hidden.
  if (tree.filter && !tree.filter.has(id)) return null

  const isRoot = node.parentId === null
  const ownHidden = !resolveProps(node).Visible
  const hidden = parentHidden || ownHidden
  // Modifiers are listed first, the way Studio lists them as children.
  const modifiers = MODIFIER_CLASSES.filter((m) => node.modifiers?.[m])
  const hasChildren = node.children.length > 0 || modifiers.length > 0
  const open = tree.filter !== null || !tree.collapsed.has(id)
  const dropPlace = tree.dropTarget?.id === id ? tree.dropTarget.place : null

  function onSelect(event: ReactMouseEvent) {
    const store = useDocumentStore.getState()
    // The ScreenGui is the whole screen, not something you can select.
    if (isRoot) store.clearSelection()
    else store.select(id, event.shiftKey)
  }

  function finishRename(newName: string | null) {
    setRenamingId(null)
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
        onContextMenu={(event) => {
          event.preventDefault() // not the browser's own menu
          openMenuFor(id, event.clientX, event.clientY)
        }}
        style={{ paddingLeft: depth * INDENT + 4 }}
        title={node.className}
        className={`group relative flex h-6 items-center gap-1.5 rounded-sm pr-1 ${
          dropPlace === 'inside'
            ? 'bg-accent-soft ring-1 ring-accent'
            : isSelected
              ? 'bg-accent-soft text-accent'
              : 'text-muted hover:bg-hover'
        }`}
      >
        {/* The marker line for "drop above" or "drop below" this row,
            indented to show which level the rows will land on. */}
        {(dropPlace === 'before' || dropPlace === 'after') && (
          <span
            className={`pointer-events-none absolute right-0 h-0.5 rounded bg-accent ${
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
            className="shrink-0 rounded text-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ChevronIcon className={open ? 'rotate-90' : undefined} />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" /> // keeps names lined up
        )}

        <ClassIcon className={node.className} />
        {renaming ? (
          <RenameInput name={node.name} onDone={finishRename} />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            onDoubleClick={() => setRenamingId(id)}
            title={`${node.className} · double-click to rename, drag to move, right-click for more`}
            className={`min-w-0 flex-1 truncate text-left text-[13px] focus-visible:outline-2 focus-visible:outline-accent ${
              hidden ? 'text-faint' : isSelected ? 'text-accent' : 'text-ink'
            }`}
          >
            {node.name}
          </button>
        )}

        {/* Insert a child: shows while the row is hovered. */}
        <RowButton
          label={`Insert into ${node.name}`}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            openMenuFor(id, box.left, box.bottom + 4, true)
          }}
        >
          <PlusIcon />
        </RowButton>
        {/* Hidden and locked rows show it, and clicking undoes it. (Hide
            and Lock themselves are in the right-click menu.) */}
        {!isRoot && ownHidden && (
          <RowButton
            shown
            label="Show"
            onClick={() => toggleVisible(useDocumentStore, id)}
          >
            <EyeOffIcon />
          </RowButton>
        )}
        {!isRoot && node.locked && (
          <RowButton
            shown
            label="Unlock"
            onClick={() => toggleLocked(useDocumentStore, id)}
          >
            <LockIcon />
          </RowButton>
        )}
      </div>

      {hasChildren && open && (
        <ul>
          {modifiers.map((modifier) => (
            <ModifierRow
              key={modifier}
              modifier={modifier}
              depth={depth + 1}
              onSelect={() => useDocumentStore.getState().select(id)}
              onMenu={(x, y) => openMenuFor(id, x, y)}
            />
          ))}
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

// A modifier listed under its element. Modifiers live on the element in
// Udimo (and become real children in the export), so clicking one selects
// the element, where the Properties panel shows the modifier's fields.
function ModifierRow({
  modifier,
  depth,
  onSelect,
  onMenu,
}: {
  modifier: ModifierClass
  depth: number
  onSelect: () => void
  onMenu: (x: number, y: number) => void // right-click: the element's menu
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={(event) => {
          event.preventDefault()
          onMenu(event.clientX, event.clientY)
        }}
        title="A modifier: edit it in the element's Properties"
        style={{ paddingLeft: depth * INDENT + 4 + 18 }}
        className="flex h-6 w-full items-center gap-1.5 rounded-sm pr-1 text-left text-[13px] text-muted hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
      >
        <ClassIcon className={modifier} />
        {modifier}
      </button>
    </li>
  )
}

// A small icon button at the end of a row. Unless `shown`, it only appears
// while the row is hovered (or the button has keyboard focus).
function RowButton({
  label,
  onClick,
  shown = false,
  children,
}: {
  label: string
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void
  shown?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`shrink-0 rounded p-1 text-muted hover:bg-hover hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent ${
        shown ? '' : 'opacity-0 group-hover:opacity-100'
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
      className="min-w-0 flex-1 rounded bg-app px-1 py-0.5 text-sm text-ink outline-1 outline-accent"
    />
  )
}
