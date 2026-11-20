import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { planWrap } from '../../model/wrap.ts'
import {
  copyToClipboard,
  hasClipboard,
  pasteFromClipboard,
} from '../../store/clipboard.ts'
import {
  deleteSelection,
  duplicateSelection,
  selectChildren,
  wrapSelectionInFrame,
} from '../../store/commands.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import {
  type ContextMenuState,
  screenOf,
  useViewStore,
} from '../../store/viewStore.ts'
import { ChevronIcon } from '../panels/icons.tsx'
import { InsertObjectMenu } from './InsertObjectMenu.tsx'

// The right-click menu, drawn once for the whole editor. Explorer rows and
// the canvas open it through the view store (see openMenu.ts).
export function ContextMenu() {
  const menu = useViewStore((state) => state.contextMenu)
  if (!menu) return null
  // A new key for each opening, so the menu starts fresh every time.
  return <MenuBox key={`${menu.x}:${menu.y}:${menu.targetId}`} menu={menu} />
}

const SHORTCUT_KEYS = {
  cut: '⌘X',
  copy: '⌘C',
  pasteInto: '⇧⌘V',
  duplicate: '⌘D',
  rename: 'F2',
  group: '⌘G',
  delete: '⌫',
}

function MenuBox({ menu }: { menu: ContextMenuState }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const close = useViewStore((state) => state.closeContextMenu)
  // Where the menu is drawn: at the pointer, moved in if it would stick
  // out of the window (worked out after it's drawn and measured).
  const [position, setPosition] = useState({ left: menu.x, top: menu.y })
  const [insertOpen, setInsertOpen] = useState(false)
  const [submenuLeft, setSubmenuLeft] = useState(false)

  useLayoutEffect(() => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    setPosition({
      left: Math.max(8, Math.min(menu.x, window.innerWidth - box.width - 8)),
      top: Math.max(8, Math.min(menu.y, window.innerHeight - box.height - 8)),
    })
    // Not enough room for the submenu on the right: open it to the left.
    setSubmenuLeft(menu.x + box.width + 300 > window.innerWidth)
  }, [menu.x, menu.y])

  // Close on a click outside, Escape, or the window changing.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) close()
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
    }
  }, [close])

  // The main menu starts with its first item focused, for the keyboard.
  useEffect(() => {
    if (!menu.insertOnly) {
      boxRef.current
        ?.querySelector<HTMLButtonElement>('button:enabled')
        ?.focus()
    }
  }, [menu.insertOnly])

  return (
    <div
      ref={boxRef}
      role="menu"
      // Right-clicking the menu itself shouldn't open the browser's menu.
      onContextMenu={(event) => event.preventDefault()}
      style={{ left: position.left, top: position.top }}
      className="fixed z-[100] rounded bg-raised py-1 shadow-2xl shadow-black/50 ring-1 ring-line"
    >
      {menu.insertOnly ? (
        <InsertObjectMenu targetId={menu.targetId} onDone={close} />
      ) : (
        <MainItems
          targetId={menu.targetId}
          insertOpen={insertOpen}
          setInsertOpen={setInsertOpen}
          submenuLeft={submenuLeft}
          close={close}
        />
      )}
    </div>
  )
}

function MainItems({
  targetId,
  insertOpen,
  setInsertOpen,
  submenuLeft,
  close,
}: {
  targetId: string
  insertOpen: boolean
  setInsertOpen: (open: boolean) => void
  submenuLeft: boolean
  close: () => void
}) {
  const doc = useDocumentStore((state) => state.document)
  const selection = useDocumentStore((state) => state.selection)
  const screen = useViewStore(screenOf)
  const isRoot = targetId === doc.rootId
  const store = useDocumentStore

  const canGroup = planWrap(doc, selection, screen) !== null

  // Runs an action, then closes the menu.
  const run = (action: () => void) => () => {
    action()
    close()
  }

  // Up/Down move between items, Right opens Insert Object.
  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = [
      ...(
        event.currentTarget as HTMLElement
      ).querySelectorAll<HTMLButtonElement>(':scope > button:enabled'),
    ]
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    items[(at + step + items.length) % items.length]?.focus()
  }

  return (
    <div className="relative w-52" onKeyDown={onKeyDown}>
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={insertOpen}
        onPointerEnter={() => setInsertOpen(true)}
        onClick={() => setInsertOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'Enter') {
            event.preventDefault()
            setInsertOpen(true)
          }
        }}
        className={`flex h-6 w-full items-center px-3 text-body focus-visible:outline-none ${
          insertOpen
            ? 'bg-accent text-accent-ink'
            : 'text-ink hover:bg-hover focus:bg-hover'
        }`}
      >
        <span className="flex-1 text-left">Insert Object</span>
        <ChevronIcon />
      </button>
      {insertOpen && (
        <div
          className={`absolute -top-1 rounded bg-raised py-1 shadow-2xl shadow-black/50 ring-1 ring-line ${
            submenuLeft ? 'right-full mr-1' : 'left-full ml-1'
          }`}
        >
          <InsertObjectMenu targetId={targetId} onDone={close} />
        </div>
      )}
      <hr className="my-1 border-line" />
      <Item
        onHover={() => setInsertOpen(false)}
        shortcut={SHORTCUT_KEYS.cut}
        disabled={isRoot}
        onClick={run(() => copyToClipboard(store, true))}
      >
        Cut
      </Item>
      <Item
        onHover={() => setInsertOpen(false)}
        shortcut={SHORTCUT_KEYS.copy}
        disabled={isRoot}
        onClick={run(() => copyToClipboard(store))}
      >
        Copy
      </Item>
      <Item
        onHover={() => setInsertOpen(false)}
        shortcut={SHORTCUT_KEYS.pasteInto}
        disabled={!hasClipboard()}
        onClick={run(() => pasteFromClipboard(store, targetId))}
      >
        Paste Into
      </Item>
      <Item
        onHover={() => setInsertOpen(false)}
        shortcut={SHORTCUT_KEYS.duplicate}
        disabled={isRoot}
        onClick={run(() => duplicateSelection(store))}
      >
        Duplicate
      </Item>
      <hr className="my-1 border-line" />
      <Item
        onHover={() => setInsertOpen(false)}
        shortcut={SHORTCUT_KEYS.rename}
        onClick={run(() => useViewStore.getState().setRenamingId(targetId))}
      >
        Rename
      </Item>
      <Item
        onHover={() => setInsertOpen(false)}
        shortcut={SHORTCUT_KEYS.group}
        disabled={!canGroup}
        onClick={run(() => wrapSelectionInFrame(store, screen))}
      >
        Group as Frame
      </Item>
      <Item
        onHover={() => setInsertOpen(false)}
        disabled={doc.nodes[targetId].children.length === 0}
        onClick={run(() => selectChildren(store, targetId))}
      >
        Select Children
      </Item>
      <hr className="my-1 border-line" />
      <Item
        onHover={() => setInsertOpen(false)}
        shortcut={SHORTCUT_KEYS.delete}
        disabled={isRoot}
        danger
        onClick={run(() => deleteSelection(store))}
      >
        Delete
      </Item>
    </div>
  )
}

function Item({
  onClick,
  onHover,
  shortcut,
  disabled,
  danger,
  children,
}: {
  onClick: () => void
  onHover: () => void
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      onPointerEnter={onHover}
      onFocus={onHover}
      className={`group flex h-6 w-full items-center px-3 text-body hover:bg-accent hover:text-accent-ink focus:bg-accent focus:text-accent-ink focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35 ${
        danger ? 'text-danger' : 'text-ink'
      }`}
    >
      <span className="flex-1 text-left">{children}</span>
      {shortcut && (
        <span className="font-mono text-note text-muted group-hover:text-accent-ink/70 group-focus:text-accent-ink/70">
          {shortcut}
        </span>
      )}
    </button>
  )
}
