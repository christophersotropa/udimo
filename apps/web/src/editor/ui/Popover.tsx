import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon } from '../panels/icons.tsx'

// Keep this far from the window's edges, in pixels.
const EDGE = 8

// A button that opens a floating box below it (a menu, a list...), which
// closes when you click elsewhere, press Escape, or scroll. `trigger` draws
// the button; `children` is the box's content, given a `close` function.
//
// The box is drawn through a portal: React puts it straight into <body>,
// on top of the whole page, rather than inside the button's panel. A panel
// hides whatever pokes out past its edges, so a menu drawn inside it got
// cut off. It's placed with position: fixed (in window pixels) below the
// button, lined up with its left or right edge, and nudged back inside the
// window if it would stick out (or opened above the button if there's no
// room below).
export function Popover({
  trigger,
  children,
  align = 'left',
  width = 'w-64',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  width?: string
}) {
  const [open, setOpen] = useState(false)
  // Where the box goes, worked out once it's drawn and can be measured.
  // Until then it's drawn see-through (opacity 0). Not visibility: hidden,
  // which would also stop anything inside from taking keyboard focus (a
  // menu's first item focusing itself as it opens). Either way it's placed
  // before the browser paints, so it's never seen in the wrong spot.
  const [place, setPlace] = useState<CSSProperties | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const close = () => {
    setOpen(false)
    setPlace(null)
  }

  // Measure the button and the box, then place the box. A layout effect
  // runs after React draws but before the browser paints, so the box never
  // shows in the wrong spot first.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !boxRef.current) return
    const anchor = anchorRef.current.getBoundingClientRect()
    const box = boxRef.current.getBoundingClientRect()
    const wanted = align === 'right' ? anchor.right - box.width : anchor.left
    const left = Math.min(
      Math.max(EDGE, wanted),
      window.innerWidth - box.width - EDGE,
    )
    const below = anchor.bottom + 4
    const top =
      below + box.height > window.innerHeight - EDGE
        ? Math.max(EDGE, anchor.top - 4 - box.height) // no room: above
        : below
    setPlace({ left, top })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      const inside =
        anchorRef.current?.contains(target) || boxRef.current?.contains(target)
      if (!inside) close()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    // The box stays put on screen, so if what's under it scrolls or the
    // window resizes, it would be left behind: close it instead. (Not for
    // scrolling inside the box itself.)
    function onScroll(event: Event) {
      if (!boxRef.current?.contains(event.target as Node)) close()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true) // true: any element
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <div ref={anchorRef} className="relative">
      {trigger({
        open,
        toggle: () => (open ? close() : setOpen(true)),
      })}
      {open &&
        createPortal(
          <div
            ref={boxRef}
            role="menu"
            style={place ?? { left: 0, top: 0, opacity: 0 }}
            className={`fixed z-50 ${width} max-h-[calc(100vh-16px)] overflow-y-auto rounded bg-raised py-1 shadow-2xl shadow-black/50 ring-1 ring-line`}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </div>
  )
}

// One row of a menu: a label, an optional hint underneath, a shortcut on
// the right, and a tick when `checked` (for on/off items like Snapping).
// The hovered row gets a neutral highlight: the accent is kept for the
// few things that need it (Export, selection), not every menu row.
export function MenuItem({
  onClick,
  children,
  hint,
  shortcut,
  checked,
  disabled,
  danger,
}: {
  onClick: () => void
  children: ReactNode
  hint?: string
  shortcut?: string
  checked?: boolean
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-2 px-3 py-1 text-left text-body hover:bg-hover focus-visible:bg-hover focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-35 ${
        danger ? 'text-danger' : 'text-ink'
      }`}
    >
      {/* A fixed-width spot for the tick keeps labels lined up. */}
      {checked !== undefined && (
        <span className="flex w-3 shrink-0 justify-center">
          {checked && <CheckIcon size={12} />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block">{children}</span>
        {hint && <span className="block text-xs text-muted ">{hint}</span>}
      </span>
      {shortcut && (
        <span className="font-mono text-note text-muted ">{shortcut}</span>
      )}
    </button>
  )
}

// A small grey heading inside a menu.
export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pt-1.5 pb-0.5 text-note text-muted">{children}</p>
}

export function MenuSeparator() {
  return <hr className="my-1 border-line" />
}
