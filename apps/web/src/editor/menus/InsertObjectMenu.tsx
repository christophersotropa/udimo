import { type KeyboardEvent, useMemo, useState } from 'react'
import { type CatalogEntry, searchCatalog } from '../../model/catalog.ts'
import { insertParent } from '../../model/insert.ts'
import type { NodeId } from '../../model/types.ts'
import { insertObject } from '../../store/commands.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { ClassBadge } from '../panels/ClassBadge.tsx'

// The "Insert Object" list: a search box, then everything you can add,
// grouped. Arrow keys move the highlight and Enter adds it, so you can
// insert without touching the mouse: right-click, type "cor", Enter.
export function InsertObjectMenu({
  targetId,
  onDone,
}: {
  targetId: NodeId
  onDone: () => void
}) {
  const doc = useDocumentStore((state) => state.document)
  const target = doc.nodes[targetId]
  const isRoot = target.parentId === null
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  // The ScreenGui can't have modifiers, so they're left out there.
  const entries = useMemo(() => searchCatalog(query, !isRoot), [query, isRoot])

  // Where a new element would go: inside a container, else beside it.
  const parentName = doc.nodes[insertParent(doc, isRoot ? [] : [targetId])].name
  const has = (entry: CatalogEntry) =>
    entry.kind === 'modifier' && Boolean(target.modifiers?.[entry.className])

  function add(entry: CatalogEntry | undefined) {
    if (!entry || has(entry)) return
    insertObject(useDocumentStore, targetId, entry)
    onDone()
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setHighlight(
        (i) => (i + step + entries.length) % Math.max(1, entries.length),
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      add(entries[highlight])
    }
  }

  return (
    <div className="w-72" onKeyDown={onKeyDown}>
      <div className="p-1.5">
        <input
          autoFocus // the list opened because you're about to type
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setHighlight(0)
          }}
          placeholder="Search objects"
          aria-label="Search objects"
          className="w-full rounded-md bg-app px-2.5 py-1.5 text-sm text-ink ring-1 ring-line outline-none placeholder:text-faint focus:ring-accent"
        />
      </div>
      <div className="max-h-80 overflow-y-auto px-1 pb-1">
        {entries.length === 0 && (
          <p className="px-2.5 py-3 text-sm text-muted">
            Nothing matches “{query}”.
          </p>
        )}
        {entries.map((entry, i) => (
          <div key={entry.className}>
            {/* A group heading before the first entry of each group. */}
            {entry.group !== entries[i - 1]?.group && (
              <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-faint uppercase">
                {entry.group}
              </p>
            )}
            <button
              type="button"
              disabled={has(entry)}
              onClick={() => add(entry)}
              onPointerEnter={() => setHighlight(i)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm disabled:opacity-40 ${
                i === highlight ? 'bg-hover' : ''
              }`}
            >
              <ClassBadge className={entry.className} />
              <span className="flex-1 text-ink">{entry.className}</span>
              <span className="text-xs text-faint">
                {has(entry) ? 'Already added' : entry.hint}
              </span>
            </button>
          </div>
        ))}
      </div>
      <p className="border-t border-line px-3 py-2 text-xs text-faint">
        Inserts into <b className="text-muted">{parentName}</b>
        {!isRoot && (
          <>
            {' '}
            · modifiers go on <b className="text-muted">{target.name}</b>
          </>
        )}{' '}
        · ↵ to add
      </p>
    </div>
  )
}
