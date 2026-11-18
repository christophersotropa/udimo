import { type ReactNode, useState } from 'react'
import { color3ToHex, hexToColor3 } from '../../lib/color.ts'
import { clamp, formatNumber, parseNumberInput } from '../../lib/numbers.ts'
import type { Color3 } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'

// Small building blocks for the Properties panel.

// Boxes that save on every keystroke (text) or every color-picker drag would
// otherwise make one undo step per tiny change. Focus starts an undo group
// and blur ends it, so one visit to a box is one undo step.
const undoGroupWhileFocused = {
  onFocus: () => useDocumentStore.getState().beginGroup(),
  onBlur: () => useDocumentStore.getState().endGroup(),
}

const inputClass =
  'w-full min-w-0 rounded bg-zinc-800 px-1.5 py-1 text-xs text-zinc-100 ring-1 ring-zinc-700 outline-none focus:ring-blue-500'

// A titled group of rows, e.g. "Layout".
export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2 border-b border-zinc-800 pb-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

// One property: its name on the left, its input(s) on the right.
export function Row({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-2">
      <span className="truncate text-xs text-zinc-400" title={label}>
        {label}
      </span>
      <div className="flex min-w-0 gap-1">{children}</div>
    </div>
  )
}

type NumberFieldProps = {
  label: string // read out by screen readers, since the box has no visible label
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  integer?: boolean // round to a whole number (pixels, ZIndex...)
}

// A number box that saves on Enter or when you click away, not on every
// keystroke, so half-typed text like "-" or "0." isn't rejected while typing.
// Escape throws the draft away. Bad input (like "abc") goes back to the old value.
export function NumberField({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  integer = false,
}: NumberFieldProps) {
  // null = not editing, so the box shows the stored value. While typing,
  // the draft holds exactly what's in the box.
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const parsed = parseNumberInput(draft)
    if (parsed !== null) {
      onChange(clamp(integer ? Math.round(parsed) : parsed, min, max))
    }
    setDraft(null)
  }

  return (
    <input
      type="text"
      inputMode="decimal" // number keyboard on phones and tablets
      aria-label={label}
      className={inputClass}
      value={draft ?? formatNumber(value)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur() // blur commits
        if (event.key === 'Escape') setDraft(null)
      }}
    />
  )
}

// A text box that saves on every keystroke, so the canvas updates as you type.
export function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      type="text"
      aria-label={label}
      className={inputClass}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...undoGroupWhileFocused}
    />
  )
}

export function CheckboxField({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="size-4 accent-blue-500"
      checked={value}
      onChange={(event) => onChange(event.target.checked)}
    />
  )
}

// The browser's own color picker, plus the hex code next to it.
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: Color3
  onChange: (value: Color3) => void
}) {
  const hex = color3ToHex(value)
  return (
    <label className="flex items-center gap-2">
      <input
        type="color"
        aria-label={label}
        className="h-6 w-8 cursor-pointer rounded bg-transparent"
        value={hex}
        onChange={(event) => onChange(hexToColor3(event.target.value))}
        {...undoGroupWhileFocused}
      />
      <span className="font-mono text-xs text-zinc-400">{hex}</span>
    </label>
  )
}
