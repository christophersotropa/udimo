import { type KeyboardEvent, useRef, useState } from 'react'
import { CATALOG } from '../../model/catalog.ts'
import { insertParent } from '../../model/insert.ts'
import type { ClassName, ModifierClass } from '../../model/types.ts'
import { insertObject } from '../../store/commands.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { ClassIcon } from '../panels/ClassIcon.tsx'
import { SearchIcon } from '../panels/icons.tsx'
import { type Command, searchCommands } from './commandSearch.ts'
import { labelOf, MENUS } from './menus.ts'

// One row the field can offer: a command (commandSearch.ts) plus where it
// comes from, whether it can run right now, and what it does.
type Row = Command & {
  group: string // "Insert", "Edit"...
  detail?: string // a second note on the right, like "into Window"
  shortcut?: string
  icon?: ClassName | ModifierClass
  checked?: boolean
  enabled: boolean
  run: () => void
}

// Everything the field can do right now: insert any class or modifier
// (into the selected element, as Insert Object does), then every menu
// action. Worked out each time it's drawn, so "can it run" is current.
function currentRows(): Row[] {
  const store = useDocumentStore
  const { document: doc, selection } = store.getState()
  const target = selection.length === 1 ? selection[0] : doc.rootId
  const targetNode = doc.nodes[target]
  const into =
    doc.nodes[insertParent(doc, target === doc.rootId ? [] : [target])]

  const inserts: Row[] = CATALOG.map((entry) => {
    const isModifier = entry.kind === 'modifier'
    return {
      id: `insert:${entry.className}`,
      label: entry.className,
      keywords: `insert add ${entry.hint} ${entry.group}`,
      group: 'Insert',
      // Elements go into the container; a modifier goes on the element.
      detail: isModifier ? `on ${targetNode.name}` : `into ${into.name}`,
      icon: entry.className,
      // The ScreenGui can't have modifiers, and each one only once.
      enabled:
        !isModifier ||
        (target !== doc.rootId &&
          !targetNode.modifiers?.[entry.className as ModifierClass]),
      run: () => insertObject(store, target, entry),
    }
  })

  const actions: Row[] = MENUS.flatMap((menu) =>
    menu.entries.flatMap((entry) =>
      entry === 'separator'
        ? []
        : [
            {
              id: `${menu.title}:${labelOf(entry)}`,
              label: labelOf(entry),
              keywords: menu.title,
              group: menu.title,
              shortcut: entry.shortcut,
              checked: entry.checked?.(),
              enabled: entry.enabled ? entry.enabled() : true,
              run: entry.run,
            },
          ],
    ),
  )
  return [...inserts, ...actions]
}

// The command field in the middle of the top bar: type to insert an
// object or run any action. ⌘K jumps here (useKeyboardShortcuts).
// Up/Down pick a result, Enter runs it, Escape clears the text, then
// leaves the field.
//
// It's a "combobox": a text box that controls a list of suggestions. The
// roles below (combobox, listbox, option, aria-activedescendant) are how
// screen readers know the highlighted suggestion while focus stays in the
// text box.
export function CommandBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  // Redraw while open when the document or selection changes, so the
  // results (and what's greyed out) stay current.
  useDocumentStore((state) => (open ? state.document : null))
  useDocumentStore((state) => (open ? state.selection : null))

  const rows = open ? searchCommands(currentRows(), query) : []
  const searching = query.trim() !== ''
  // Keep the highlight on a row that exists.
  const active = Math.min(highlight, Math.max(0, rows.length - 1))

  function close() {
    setOpen(false)
    setQuery('')
    setHighlight(0)
  }

  function run(row: Row | undefined) {
    if (!row?.enabled) return
    close()
    inputRef.current?.blur()
    row.run()
  }

  // Moves the highlight to the next row that can run, wrapping around.
  function move(step: 1 | -1) {
    for (let i = 1; i <= rows.length; i++) {
      const next = (active + step * i + rows.length * i) % rows.length
      if (rows[next].enabled) return setHighlight(next)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      move(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      run(rows[active])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (query) {
        setQuery('')
        setHighlight(0)
      } else {
        close()
        inputRef.current?.blur()
      }
    }
  }

  return (
    <div className="relative w-[clamp(220px,30vw,440px)]">
      <div className="flex h-7 items-center gap-2 rounded bg-raised px-2 ring-1 ring-line focus-within:ring-accent">
        <SearchIcon className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          id="command-bar"
          role="combobox"
          aria-expanded={open}
          aria-controls="command-results"
          aria-autocomplete="list"
          aria-activedescendant={
            open && rows[active] ? `command-option-${active}` : undefined
          }
          aria-label="Insert an object or search actions"
          placeholder="Insert an object or search actions…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setHighlight(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-muted"
        />
        {!open && (
          <kbd className="shrink-0 font-mono text-note text-muted">⌘K</kbd>
        )}
      </div>

      {open && (
        <ul
          id="command-results"
          role="listbox"
          aria-label="Results"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-[min(24rem,70vh)] overflow-y-auto rounded bg-raised py-1 shadow-2xl shadow-black/50 ring-1 ring-line"
        >
          {rows.length === 0 && (
            <li className="px-3 py-2 text-body text-muted">
              Nothing matches “{query.trim()}”.
            </li>
          )}
          {rows.map((row, i) => (
            <CommandRow
              key={row.id}
              row={row}
              index={i}
              active={i === active}
              // Without a search, rows come in their groups: name each
              // group once. With one, they're ranked, so each row says
              // its group on the right instead.
              heading={
                !searching && rows[i - 1]?.group !== row.group
                  ? row.group
                  : undefined
              }
              showGroup={searching}
              onPoint={() => row.enabled && setHighlight(i)}
              onRun={() => run(row)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function CommandRow({
  row,
  index,
  active,
  heading,
  showGroup,
  onPoint,
  onRun,
}: {
  row: Row
  index: number
  active: boolean
  heading?: string
  showGroup: boolean
  onPoint: () => void
  onRun: () => void
}) {
  return (
    <>
      {heading && (
        <li
          role="presentation"
          className="px-3 pt-2 pb-0.5 text-note text-muted first:pt-1"
        >
          {heading}
        </li>
      )}
      <li
        id={`command-option-${index}`}
        role="option"
        aria-selected={active}
        aria-disabled={!row.enabled}
        onPointerMove={onPoint}
        // mousedown would move focus out of the field (and close the list)
        // before the click lands; preventDefault keeps it in the field.
        onMouseDown={(event) => event.preventDefault()}
        onClick={onRun}
        className={`flex h-7 cursor-default items-center gap-2 px-3 text-body ${
          active ? 'bg-hover' : ''
        } ${row.enabled ? 'text-ink' : 'text-faint'}`}
      >
        {row.icon ? (
          <ClassIcon className={row.icon} />
        ) : (
          // Lines up action names with class names.
          <span className="w-3.5 shrink-0 text-center text-xs text-muted">
            {row.checked ? '✓' : ''}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{row.label}</span>
        {(row.detail || showGroup) && (
          <span className="shrink-0 truncate text-note text-muted">
            {row.detail ?? row.group}
          </span>
        )}
        {row.shortcut && (
          <span className="shrink-0 font-mono text-note text-muted">
            {row.shortcut}
          </span>
        )}
      </li>
    </>
  )
}
