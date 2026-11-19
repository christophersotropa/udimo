import { type ReactNode, useState } from 'react'
import { color3ToHex, hexToColor3, parseHexColor } from '../../lib/color.ts'
import { clamp, formatNumber, parseNumberInput } from '../../lib/numbers.ts'
import type { Color3, UDim2 } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { Switch } from '../ui/Switch.tsx'

// Small building blocks for the Properties panel.

// Boxes that save on every keystroke (text) or every color-picker drag would
// otherwise make one undo step per tiny change. Focus starts an undo group
// and blur ends it, so one visit to a box is one undo step.
const undoGroupWhileFocused = {
  onFocus: () => useDocumentStore.getState().beginGroup(),
  onBlur: () => useDocumentStore.getState().endGroup(),
}

const inputClass =
  'h-8 w-full min-w-0 rounded-md bg-app px-2.5 text-sm text-ink ring-1 ring-line outline-none hover:ring-hover focus:ring-accent'

// A titled group of rows, e.g. "Layout", separated by a line.
export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2 border-b border-line px-3.5 py-3.5">
      <h3 className="pb-0.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
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
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      <span className="truncate text-sm text-muted" title={label}>
        {label}
      </span>
      <div className="flex min-w-0 gap-1.5">{children}</div>
    </div>
  )
}

// The "Scale | Offset px" headings over a block of UDim rows.
export function ColumnHeads({ left, right }: { left: string; right: string }) {
  return (
    <p className="grid grid-cols-[84px_1fr_1fr] gap-1.5 text-[11px] text-faint">
      <span />
      <span className="pl-1">{left}</span>
      <span className="pl-1">{right}</span>
    </p>
  )
}

// A small line of help under a field.
export function Hint({
  children,
  warn = false,
}: {
  children: ReactNode
  warn?: boolean
}) {
  return (
    <p className={`text-xs ${warn ? 'text-warn' : 'text-faint'}`}>{children}</p>
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
      className={`${inputClass} tabular-nums`}
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

// An on/off property, shown as a switch.
export function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return <Switch label={label} checked={value} onChange={onChange} />
}

// A color: a swatch that opens the browser's color picker, and the hex code
// next to it, which you can also type into (saved on Enter or click away).
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: Color3
  onChange: (value: Color3) => void
}) {
  const hex = color3ToHex(value).toUpperCase()
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const typed = parseHexColor(draft)
    if (typed) onChange(typed) // anything else goes back to the old color
    setDraft(null)
  }

  return (
    <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md bg-app pl-1.5 ring-1 ring-line focus-within:ring-accent">
      {/* The swatch is a real color input, made to look like a square. */}
      <input
        type="color"
        aria-label={`${label} picker`}
        className="size-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        value={hex.toLowerCase()}
        onChange={(event) => onChange(hexToColor3(event.target.value))}
        {...undoGroupWhileFocused}
      />
      <input
        type="text"
        aria-label={label}
        spellCheck={false}
        className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm text-ink outline-none"
        value={draft ?? hex}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') setDraft(null)
        }}
      />
    </div>
  )
}

// A dropdown for one of a Roblox enum's options, like FillDirection.
// `labels` can give options friendlier names than their values.
export function SelectField<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  labels?: Partial<Record<T, string>>
  onChange: (value: T) => void
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={`${inputClass} pr-1`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels?.[option] ?? option}
        </option>
      ))}
    </select>
  )
}

// A UDim2 (like Position or Size) as two rows, X then Y, each with Scale
// and Offset, like Studio shows them. `name` is the property, for screen
// readers; `short` is the visible label ("Pos" shows "Pos X", "Pos Y").
export function UDim2Rows({
  name,
  short = name,
  value,
  onChange,
}: {
  name: string
  short?: string
  value: UDim2
  onChange: (value: UDim2) => void
}) {
  return (
    <>
      <Row label={`${short} X`}>
        <NumberField
          label={`${name} X Scale`}
          value={value.xs}
          onChange={(xs) => onChange({ ...value, xs })}
        />
        <NumberField
          label={`${name} X Offset`}
          integer
          value={value.xo}
          onChange={(xo) => onChange({ ...value, xo })}
        />
      </Row>
      <Row label={`${short} Y`}>
        <NumberField
          label={`${name} Y Scale`}
          value={value.ys}
          onChange={(ys) => onChange({ ...value, ys })}
        />
        <NumberField
          label={`${name} Y Offset`}
          integer
          value={value.yo}
          onChange={(yo) => onChange({ ...value, yo })}
        />
      </Row>
    </>
  )
}
