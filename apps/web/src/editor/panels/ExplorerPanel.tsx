import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { resolveProps } from '../../model/defaults.ts'
import { ancestorIds } from '../../model/tree.ts'
import type { NodeId } from '../../model/types.ts'
import { toggleLocked, toggleVisible } from '../../store/commands.ts'
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

// The instance tree, like Roblox Studio's Explorer: ScreenGui > Frame > ...
// Children are listed in document order, the same order as the export.
export function ExplorerPanel() {
  const rootId = useDocumentStore((state) => state.document.rootId)
  const selection = useDocumentStore((state) => state.selection)
  // Ids of the rows you've folded shut. Only this panel cares about it, so
  // it's React state here, not in the store (and it's never undone or saved).
  const [collapsed, setCollapsed] = useState<ReadonlySet<NodeId>>(new Set())

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

  return (
    <Panel title="Explorer" side="left">
      <ul>
        <TreeRow
          id={rootId}
          depth={0}
          parentHidden={false}
          collapsed={collapsed}
          onToggleOpen={toggleOpen}
        />
      </ul>
    </Panel>
  )
}

type TreeRowProps = {
  id: NodeId
  depth: number
  // True if some element above this one is hidden, which hides this one too.
  parentHidden: boolean
  collapsed: ReadonlySet<NodeId>
  onToggleOpen: (id: NodeId) => void
}

// One row, then the rows of its children inside it: recursive, like the
// canvas's NodeView. Each row reads only its own node from the store.
function TreeRow({
  id,
  depth,
  parentHidden,
  collapsed,
  onToggleOpen,
}: TreeRowProps) {
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
  const open = !collapsed.has(id)

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

  return (
    <li>
      <div
        ref={rowRef}
        style={{ paddingLeft: depth * INDENT }}
        className={`group flex items-center gap-1 rounded pr-1 ${
          isSelected ? 'bg-blue-600/30' : 'hover:bg-zinc-800'
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => onToggleOpen(id)}
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
            title="Double-click to rename"
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
              collapsed={collapsed}
              onToggleOpen={onToggleOpen}
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
