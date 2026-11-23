import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { resolveProps } from '../../model/defaults.ts'
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
import { openMenuFor, openModifierMenu } from '../menus/openMenu.ts'
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
import {
  type ActiveLine,
  followSelection,
  lineDomId,
  treeKeyAction,
} from './treeKeys.ts'
import { type DropTarget, useExplorerDrag } from './useExplorerDrag.ts'

// How far each level of the tree is indented, in pixels.
const INDENT = 12 // (useExplorerDrag uses the same)

// What every row needs from the panel: folding, filtering, and dragging
// rows around. Bundled into one object so it's handed down as one prop.
type TreeControls = {
  collapsed: ReadonlySet<NodeId>
  // While filtering: the rows to show (matches and their parents), all
  // unfolded. null when not filtering.
  filter: Set<NodeId> | null
  toggleOpen: (id: NodeId) => void
  // While dragging (useExplorerDrag): the row you grabbed and how many move
  // with it, the other selected rows moving along, and where they'd land.
  lifted: { id: NodeId; count: number } | null
  dragIds: ReadonlySet<NodeId>
  dropTarget: DropTarget | null
  onRowPointerDown: (event: ReactPointerEvent<HTMLElement>, id: NodeId) => void
  // The keyboard's current line (see treeKeys.ts), and whether to outline
  // it: while the tree has focus, so you can see the arrow keys will move
  // through the tree (and not nudge the element on the canvas).
  active: ActiveLine
  showActive: boolean
  // A click on a line makes it current and puts keyboard focus in the
  // tree, so the arrow keys carry on from there.
  activate: (line: ActiveLine) => void
  focusTree: () => void
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
  const [query, setQuery] = useState('')
  // Only read the whole document while filtering: otherwise every edit
  // would redraw the whole tree.
  const filterDoc = useDocumentStore((state) => (query ? state.document : null))
  const filter = useMemo(
    () => (filterDoc ? filterTree(filterDoc, query) : null),
    [filterDoc, query],
  )
  // Dragging rows to move them: see useExplorerDrag.
  const { listRef, lifted, dragIds, dropTarget, onRowPointerDown } =
    useExplorerDrag((target) => {
      const moved = moveNodesTo(
        useDocumentStore,
        useDocumentStore.getState().selection,
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
    })

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

  // Keyboard use. The tree is one stop for the Tab key; inside it the arrow
  // keys move from line to line. Focus stays on the list itself, and
  // aria-activedescendant tells screen readers which line is current. (The
  // other way, moving focus onto each line, gets tangled up with the
  // buttons inside the lines.)
  const [lastActive, setLastActive] = useState<ActiveLine | null>(null)
  const active = followSelection(lastActive, selection, rootId)
  const [treeFocused, setTreeFocused] = useState(false)

  function focusTree() {
    listRef.current?.focus({ preventScroll: true })
  }

  // Moves to a line, selecting it the way a click would. With Shift, the
  // line is added to the selection instead.
  function goTo(line: HTMLElement, extend: boolean) {
    const store = useDocumentStore.getState()
    // Element lines carry data-row-id; modifier lines, their element's id.
    const id = (line.dataset.rowId ?? line.dataset.ownerId) as NodeId
    const modifier = line.dataset.modifier as ModifierClass | undefined
    setLastActive({ id, modifier })
    if (id === rootId) {
      if (!extend) store.clearSelection()
    } else if (!extend) {
      store.select(id)
    } else if (!store.selection.includes(id)) {
      store.select(id, true)
    }
    // A modifier line shows that modifier's fields in Properties, as a
    // click on it does.
    if (modifier && !extend) {
      useViewStore.getState().revealModifier(id, modifier)
    }
    line.scrollIntoView({ block: 'nearest' })
  }

  function onTreeKeyDown(event: ReactKeyboardEvent<HTMLUListElement>) {
    // The rename box handles its own keys.
    if ((event.target as Element).closest('input')) return
    // Delete on a modifier line removes that modifier, not the element it's
    // on (which is what the editor's own Delete shortcut would remove: the
    // element is what's selected).
    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      active.modifier
    ) {
      event.preventDefault()
      event.stopPropagation()
      useDocumentStore.getState().removeModifier(active.id, active.modifier)
      setLastActive({ id: active.id }) // carry on from the element's line
      return
    }
    const elements = [
      ...(listRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ??
        []),
    ]
    const lines = elements.map((element) => {
      const expanded = element.getAttribute('aria-expanded')
      return {
        level: Number(element.getAttribute('aria-level')),
        expanded: expanded === null ? null : expanded === 'true',
      }
    })
    const current = elements.findIndex(
      (element) => element.id === lineDomId(active),
    )
    const action = treeKeyAction(lines, current, event.key, event.shiftKey)
    if (!action) return // Delete, F2, ⌘C...: the editor's shortcuts
    // Handled here: keep it from the editor's shortcuts (an arrow would
    // nudge the selection on the canvas) and from the page (scrolling).
    event.preventDefault()
    event.stopPropagation()
    if (action.kind === 'none') return

    const line = elements[action.index]
    const id = (line.dataset.rowId ?? line.dataset.ownerId) as NodeId
    if (action.kind === 'focus') goTo(line, event.shiftKey)
    else if (action.kind === 'select') goTo(line, false)
    else if (action.kind === 'expand' || action.kind === 'collapse') {
      toggleOpen(id)
    } else {
      const box = line.getBoundingClientRect()
      const modifier = line.dataset.modifier as ModifierClass | undefined
      if (modifier) openModifierMenu(id, modifier, box.left + 24, box.bottom)
      else openMenuFor(id, box.left + 24, box.bottom)
    }
  }

  const tree: TreeControls = {
    collapsed,
    filter,
    toggleOpen,
    lifted,
    dragIds,
    dropTarget,
    onRowPointerDown,
    active,
    showActive: treeFocused,
    activate: setLastActive,
    focusTree,
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
      id="explorer"
      title="Explorer"
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
          className="h-7 w-full rounded bg-app px-2 text-body text-ink ring-1 ring-line outline-none placeholder:text-muted focus:ring-accent"
        />
      </div>
      {filter?.size === 0 && (
        <p className="px-1 text-sm text-muted">Nothing called “{query}”.</p>
      )}
      {/* role="tree": a screen reader announces the lines as a tree, with
          their level and whether each is selected and unfolded. */}
      <ul
        ref={listRef}
        role="tree"
        aria-label="Explorer"
        aria-multiselectable="true"
        aria-activedescendant={lineDomId(active)}
        tabIndex={filter?.size === 0 ? -1 : 0}
        onKeyDown={onTreeKeyDown}
        // React's onFocus/onBlur also fire for the buttons inside, so these
        // track focus anywhere in the tree.
        onFocus={() => setTreeFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setTreeFocused(false)
          }
        }}
        className="outline-none"
      >
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

  // The line is current for the keyboard (outlined only while you use it).
  const isActive = tree.active.id === id && !tree.active.modifier

  // A click on the name: select, like before, and leave keyboard focus in
  // the tree so the arrow keys carry on from this line.
  function onNameClick(event: ReactMouseEvent) {
    onSelect(event)
    tree.activate({ id })
    tree.focusTree()
  }

  function finishRename(newName: string | null) {
    setRenamingId(null)
    // null means cancelled. An empty name would be hard to find in Studio,
    // so it keeps the old name instead.
    if (newName !== null && newName.trim() !== '') {
      useDocumentStore.getState().renameNode(id, newName)
    }
  }

  return (
    // Other selected rows being moved along dim in place (the grabbed one
    // is lifted and follows the pointer instead).
    // role="none" on the <li> and <ul>s: for screen readers the tree is a
    // flat list of lines (the row <div>s), each saying its own level.
    <li
      role="none"
      className={`transition-opacity duration-150 ${
        tree.dragIds.has(id) ? 'opacity-40' : ''
      }`}
    >
      <div
        ref={rowRef}
        id={lineDomId({ id })}
        role="treeitem"
        // What a screen reader says: "Window, Frame, hidden".
        aria-label={[
          node.name,
          node.className,
          hidden && 'hidden',
          node.locked && 'locked',
        ]
          .filter(Boolean)
          .join(', ')}
        aria-level={depth + 1}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? open : undefined}
        // For the drag: one line of the tree, which row, and how deep.
        data-tree-line
        data-row-id={id}
        data-depth={depth}
        onPointerDown={
          isRoot || renaming
            ? undefined
            : (event) => tree.onRowPointerDown(event, id)
        }
        onContextMenu={(event) => {
          event.preventDefault() // not the browser's own menu
          openMenuFor(id, event.clientX, event.clientY)
        }}
        style={{ paddingLeft: depth * INDENT + 4 }}
        title={node.className}
        className={`group relative flex h-6 items-center gap-1.5 rounded-sm pr-1 transition-colors duration-100 ${
          isActive && tree.showActive
            ? 'outline-1 -outline-offset-1 outline-accent'
            : ''
        } ${
          dropPlace === 'inside'
            ? 'bg-accent-soft ring-1 ring-accent'
            : isSelected
              ? 'bg-select-soft text-select'
              : 'text-muted hover:bg-hover'
        }`}
      >
        {/* Faint lines down each level the row sits inside, so you can see
            what's inside what. */}
        {Array.from({ length: depth }, (_, level) => (
          <span
            key={level}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-px bg-line"
            style={{ left: level * INDENT + 10 }}
          />
        ))}

        {hasChildren ? (
          <button
            type="button"
            data-no-drag // pressing it folds, never drags
            // Not a Tab stop of its own: the arrow keys fold and unfold.
            tabIndex={-1}
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => tree.toggleOpen(id)}
            className="shrink-0 rounded text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ChevronIcon className={open ? 'rotate-90' : undefined} />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" /> // keeps names lined up
        )}

        <ClassIcon className={node.className} />
        {renaming ? (
          <RenameInput
            name={node.name}
            onDone={finishRename}
            onKeyedDone={tree.focusTree}
          />
        ) : (
          <button
            type="button"
            tabIndex={-1} // the arrow keys reach it instead
            onClick={onNameClick}
            onDoubleClick={() => setRenamingId(id)}
            title={`${node.className} · double-click to rename, drag to move, right-click for more`}
            className={`min-w-0 flex-1 truncate text-left text-body focus-visible:outline-2 focus-visible:outline-accent ${
              hidden ? 'text-faint' : isSelected ? 'text-select' : 'text-ink'
            }`}
          >
            {node.name}
          </button>
        )}
        {/* Dragging several rows: the grabbed one says how many more. */}
        {tree.lifted?.id === id && tree.lifted.count > 1 && (
          <span className="shrink-0 rounded-sm bg-accent-fill px-1 font-mono text-badge font-semibold text-accent-ink">
            +{tree.lifted.count - 1}
          </span>
        )}
        {/* Folded rows say how much is inside, so nothing is out of mind. */}
        {hasChildren && !open && !renaming && (
          <span className="shrink-0 rounded-sm bg-raised px-1 font-mono text-badge text-muted">
            {node.children.length + modifiers.length}
          </span>
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
        <ul role="none">
          {modifiers.map((modifier) => (
            <ModifierRow
              key={modifier}
              ownerId={id}
              modifier={modifier}
              depth={depth + 1}
              outlined={
                tree.showActive &&
                tree.active.id === id &&
                tree.active.modifier === modifier
              }
              onSelect={() => {
                useDocumentStore.getState().select(id)
                useViewStore.getState().revealModifier(id, modifier)
                tree.activate({ id, modifier })
                tree.focusTree()
              }}
              onMenu={(x, y) => openModifierMenu(id, modifier, x, y)}
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
// the element and opens that modifier's fields in Properties. Right-click
// (and Delete) act on the modifier alone, never on the element.
function ModifierRow({
  ownerId,
  modifier,
  depth,
  outlined,
  onSelect,
  onMenu,
}: {
  ownerId: NodeId // the element it's on
  modifier: ModifierClass
  depth: number
  outlined: boolean // the keyboard's current line, while you use it
  onSelect: () => void
  onMenu: (x: number, y: number) => void // right-click: the modifier's own menu
}) {
  return (
    <li role="none">
      <button
        type="button"
        id={lineDomId({ id: ownerId, modifier })}
        role="treeitem"
        aria-label={`${modifier}, modifier`}
        aria-level={depth + 1}
        // Selecting it selects the element, so the line itself never is.
        aria-selected={false}
        tabIndex={-1} // the arrow keys reach it instead
        // A line of the tree, for the drag to measure and slide aside.
        data-tree-line
        data-owner-id={ownerId}
        data-modifier={modifier}
        data-depth={depth}
        onClick={onSelect}
        onContextMenu={(event) => {
          event.preventDefault()
          onMenu(event.clientX, event.clientY)
        }}
        title="Click to edit in Properties · right-click for more"
        style={{ paddingLeft: depth * INDENT + 4 + 18 }}
        className={`flex h-6 w-full items-center gap-1.5 rounded-sm pr-1 text-left text-body text-muted hover:bg-hover ${
          outlined ? 'outline-1 -outline-offset-1 outline-accent' : ''
        }`}
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
      data-no-drag
      // Not a Tab stop: from the keyboard, the right-click menu (menu key
      // or Shift+F10) inserts, and ⌘⇧H / ⌘⇧L show and unlock.
      tabIndex={-1}
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
  onKeyedDone,
}: {
  name: string
  onDone: (newName: string | null) => void
  // After Enter or Escape (not a click elsewhere): hands keyboard focus
  // back to the tree, so you can carry on with the arrow keys.
  onKeyedDone: () => void
}) {
  const [draft, setDraft] = useState(name)
  // A ref, not state: it must be readable in onBlur right away, before
  // React has re-rendered.
  const cancelled = useRef(false)

  return (
    <input
      data-no-drag
      autoFocus // it only appears because you asked to rename
      aria-label="Name"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.target.select()} // select all, ready to type over
      onBlur={() => onDone(cancelled.current ? null : draft)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== 'Escape') return
        if (event.key === 'Escape') cancelled.current = true
        event.currentTarget.blur() // saves (or cancels) through onBlur
        onKeyedDone()
      }}
      className="min-w-0 flex-1 rounded bg-app px-1 py-0.5 text-sm text-ink outline-1 outline-accent"
    />
  )
}
