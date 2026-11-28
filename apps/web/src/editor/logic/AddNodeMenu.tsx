import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  GRAPH_NODE_KINDS,
  type GraphNodeKind,
  searchGraphKinds,
} from '../../model/graph.ts'

// The "Add node" menu: a search box, then every kind of graph node,
// events first, each with a one-line hint. It opens where you right-click
// the graph (or where you let go of a wire you dragged into empty space,
// when it lists only actions, since only actions can follow). Arrow keys
// move the highlight and Enter adds, like the Insert Object menu.
export function AddNodeMenu({
  x,
  y,
  actionsOnly,
  onPick,
  onClose,
}: {
  x: number // where it opens, in page pixels
  y: number
  actionsOnly: boolean
  onPick: (kind: GraphNodeKind) => void
  onClose: () => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const kinds = useMemo(
    () => searchGraphKinds(query, actionsOnly),
    [query, actionsOnly],
  )
  // At the pointer, moved in if it would stick out of the window (worked
  // out once it's drawn and measured, like the right-click menu).
  const [position, setPosition] = useState({ left: x, top: y })
  useLayoutEffect(() => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - box.height - 8)),
    })
  }, [x, y])

  // Close on a click outside, Escape, or the window changing.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) onClose()
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onClose)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setHighlight((i) => (i + step + kinds.length) % Math.max(1, kinds.length))
    } else if (event.key === 'Enter' && kinds[highlight]) {
      event.preventDefault()
      onPick(kinds[highlight])
    }
  }

  return (
    <div
      ref={boxRef}
      role="menu"
      aria-label="Add node"
      onKeyDown={onKeyDown}
      // Right-clicking inside the menu shouldn't open the browser's menu.
      onContextMenu={(event) => event.preventDefault()}
      className="fixed z-50 w-72 rounded-md bg-raised shadow-[0_8px_24px_rgb(0_0_0/0.5)] ring-1 ring-line"
      style={position}
    >
      <div className="p-1">
        <input
          autoFocus // it opened because you're about to pick something
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setHighlight(0)
          }}
          placeholder={actionsOnly ? 'Search actions' : 'Search nodes'}
          aria-label="Search nodes"
          className="h-7 w-full rounded-sm bg-app px-2 text-body text-ink ring-1 ring-accent outline-none placeholder:text-muted"
        />
      </div>
      <div className="max-h-80 overflow-y-auto pb-1">
        {kinds.length === 0 && (
          <p className="px-2.5 py-3 text-sm text-muted">
            Nothing matches “{query}”.
          </p>
        )}
        {kinds.map((kind, i) => {
          const info = GRAPH_NODE_KINDS[kind]
          const previous = kinds[i - 1]
          return (
            <div key={kind}>
              {/* A heading before the first of each role. */}
              {(!previous || GRAPH_NODE_KINDS[previous].role !== info.role) && (
                <p className="px-3 pt-1.5 pb-0.5 text-note text-muted">
                  {info.role === 'event' ? 'Events' : 'Actions'}
                </p>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => onPick(kind)}
                onPointerEnter={() => setHighlight(i)}
                className={`flex w-full items-start gap-2 px-3 py-1 text-left ${
                  i === highlight ? 'bg-accent-soft' : ''
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    info.role === 'event' ? 'bg-event' : 'bg-action'
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-body text-ink">{info.title}</span>
                  <span className="block truncate text-note text-muted">
                    {info.hint}
                  </span>
                </span>
              </button>
            </div>
          )
        })}
      </div>
      <p className="flex justify-between border-t border-line px-3 pt-1.5 pb-1 text-note text-muted">
        <span>{actionsOnly ? 'Wired after the node' : 'Added here'}</span>
        <span>↵ add</span>
      </p>
    </div>
  )
}
