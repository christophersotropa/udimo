import { type ReactNode, useEffect, useRef, useState } from 'react'

// A button that opens a floating box below it (a menu, a list...), which
// closes when you click elsewhere or press Escape. `trigger` draws the
// button; `children` is the box's content, given a `close` function.
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
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={boxRef} className="relative">
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && (
        <div
          role="menu"
          className={`absolute top-full z-50 mt-1 ${width} ${
            align === 'right' ? 'right-0' : 'left-0'
          } rounded bg-raised py-1 shadow-2xl shadow-black/50 ring-1 ring-line`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

// One row of a menu: a label, an optional hint underneath, a shortcut on
// the right, and a tick when `checked` (for on/off items like Snapping).
// The hovered row turns amber, like the rest of the accent.
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
      className={`group flex w-full items-center gap-2 px-3 py-1 text-left text-[13px] hover:bg-accent hover:text-accent-ink focus-visible:bg-accent focus-visible:text-accent-ink focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35 ${
        danger ? 'text-danger' : 'text-ink'
      }`}
    >
      {/* A fixed-width spot for the tick keeps labels lined up. */}
      {checked !== undefined && (
        <span className="w-3 shrink-0 text-xs">{checked ? '✓' : ''}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block">{children}</span>
        {hint && (
          <span className="block text-xs text-muted group-hover:text-accent-ink/70 group-focus-visible:text-accent-ink/70">
            {hint}
          </span>
        )}
      </span>
      {shortcut && (
        <span className="font-mono text-[11px] text-faint group-hover:text-accent-ink/70 group-focus-visible:text-accent-ink/70">
          {shortcut}
        </span>
      )}
    </button>
  )
}

// A small grey heading inside a menu.
export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pt-1.5 pb-0.5 text-[11px] text-faint">{children}</p>
}

export function MenuSeparator() {
  return <hr className="my-1 border-line" />
}
