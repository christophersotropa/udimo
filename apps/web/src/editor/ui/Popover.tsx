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
          className={`absolute top-full z-50 mt-1.5 ${width} ${
            align === 'right' ? 'right-0' : 'left-0'
          } rounded-lg bg-raised p-1 shadow-2xl ring-1 ring-line`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

// One row of a menu: a label, an optional hint underneath or shortcut on
// the right.
export function MenuItem({
  onClick,
  children,
  hint,
  shortcut,
  disabled,
}: {
  onClick: () => void
  children: ReactNode
  hint?: string
  shortcut?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-left hover:bg-hover focus-visible:bg-hover focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">{children}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {shortcut && <span className="text-xs text-faint">{shortcut}</span>}
    </button>
  )
}

// A small grey heading inside a menu.
export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-faint uppercase">
      {children}
    </p>
  )
}

export function MenuSeparator() {
  return <hr className="my-1 border-line" />
}
