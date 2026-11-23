import { type KeyboardEvent, useState } from 'react'
import { CATALOG } from '../../model/catalog.ts'
import { actions } from '../actions.ts'
import { ChevronDownIcon, ChevronIcon } from '../panels/icons.tsx'
import { MenuItem, MenuSeparator, Popover } from '../ui/Popover.tsx'
import { Logo } from './Logo.tsx'
import { labelOf, MENUS, type Menu } from './menus.ts'

// Insert, as a menu: the element classes, added into the selection (or
// next to it). Modifiers are added from the right-click menu, Properties,
// or the command field.
const INSERT_MENU: Menu = {
  title: 'Insert',
  // flatMap with [] for modifiers: keeps the elements, and TypeScript then
  // knows each className is an element class.
  entries: CATALOG.flatMap((entry) =>
    entry.kind === 'element'
      ? [{ label: entry.className, run: () => actions.insert(entry.className) }]
      : [],
  ),
}
// In the usual order: Insert sits between View and Arrange.
const ALL_MENUS: Menu[] = [...MENUS.slice(0, 3), INSERT_MENU, MENUS[3]]

// The Udimo menu: one button with the logo that holds File, Edit, View,
// Insert and Arrange, so the top bar has room for the command field.
// It opens as two columns: the menus down the left, the pointed-at menu's
// items on the right. The keyboard works it too: Up/Down within a column,
// Right into a menu's items, Left back out, Enter to run, Escape to close.
export function AppMenu() {
  return (
    <Popover
      width="w-[26rem]"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Udimo menu: File, Edit, View, Insert, Arrange"
          className={`flex h-7 items-center gap-2 rounded pr-1.5 pl-1.5 text-body focus-visible:outline-2 focus-visible:outline-accent ${
            open ? 'bg-hover' : 'hover:bg-hover'
          }`}
        >
          {/* flex, not inline: an inline SVG sits on the text baseline,
              which pushes it off-center. */}
          <span className="flex text-ink">
            <Logo size={20} />
          </span>
          <span className="font-semibold text-ink">Udimo</span>
          <ChevronDownIcon className="text-muted" />
        </button>
      )}
    >
      {(close) => <MenuColumns close={close} />}
    </Popover>
  )
}

function MenuColumns({ close }: { close: () => void }) {
  const [title, setTitle] = useState(ALL_MENUS[0].title)
  const menu = ALL_MENUS.find((m) => m.title === title)!

  // Up/Down move within the column that has focus; Right goes into the
  // items, Left back to the menu names.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const here = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-column]',
    )
    if (!here) return
    const buttons = (column: Element | null) => [
      ...(column?.querySelectorAll<HTMLButtonElement>('button:enabled') ?? []),
    ]
    const columns = event.currentTarget.querySelectorAll('[data-column]')
    const [names, items] = [columns[0], columns[1]]
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const list = buttons(here)
      const at = list.indexOf(document.activeElement as HTMLButtonElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      list[(at + step + list.length) % list.length]?.focus()
    } else if (event.key === 'ArrowRight' && here === names) {
      event.preventDefault()
      buttons(items)[0]?.focus()
    } else if (event.key === 'ArrowLeft' && here === items) {
      event.preventDefault()
      names.querySelector<HTMLButtonElement>('[aria-expanded="true"]')?.focus()
    }
  }

  return (
    <div className="flex" onKeyDown={onKeyDown}>
      <div data-column className="w-28 shrink-0 border-r border-line">
        {ALL_MENUS.map((m, i) => (
          <button
            key={m.title}
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={m.title === title}
            // Opening the menu puts the keyboard on the first name.
            autoFocus={i === 0}
            onPointerEnter={() => setTitle(m.title)}
            onFocus={() => setTitle(m.title)}
            className={`flex h-7 w-full items-center px-3 text-left text-body focus-visible:outline-none ${
              m.title === title ? 'bg-hover text-ink' : 'text-muted'
            }`}
          >
            <span className="flex-1">{m.title}</span>
            <ChevronIcon className="text-muted" />
          </button>
        ))}
      </div>
      <div
        data-column
        role="menu"
        aria-label={title}
        className="min-w-0 flex-1"
      >
        {menu.entries.map((entry, i) =>
          entry === 'separator' ? (
            <MenuSeparator key={i} />
          ) : (
            <MenuItem
              key={labelOf(entry)}
              shortcut={entry.shortcut}
              disabled={entry.enabled ? !entry.enabled() : false}
              checked={entry.checked?.()}
              onClick={() => {
                close()
                entry.run()
              }}
            >
              {labelOf(entry)}
            </MenuItem>
          ),
        )}
      </div>
    </div>
  )
}
