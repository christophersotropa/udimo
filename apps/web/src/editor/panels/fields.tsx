import { type ReactNode, useContext, useState } from 'react'
import { color3ToHex, hexToColor3 } from '../../lib/color.ts'
import { clamp, formatNumber, parseNumberInput } from '../../lib/numbers.ts'
import {
  formatColor3,
  formatUDim,
  formatUDim2,
  parseColor3,
  parseUDim,
  parseUDim2,
} from '../../lib/robloxText.ts'
import type { Color3, UDim, UDim2 } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { useViewStore } from '../../store/viewStore.ts'
import { ChevronIcon } from './icons.tsx'
import { PropertyFilter } from './propertyFilter.ts'

// The building blocks of the Properties panel, in Studio's style: a column
// of property names, values in monospace, typed the way Studio shows them.

// Boxes that save on every keystroke (text) or every color-picker drag would
// otherwise make one undo step per tiny change. Focus starts an undo group
// and blur ends it, so one visit to a box is one undo step.
const undoGroupWhileFocused = {
  onFocus: () => useDocumentStore.getState().beginGroup(),
  onBlur: () => useDocumentStore.getState().endGroup(),
}

const inputClass =
  'h-6 w-full min-w-0 rounded-sm bg-app px-1.5 font-mono text-xs text-ink ring-1 ring-line outline-none hover:ring-hover focus:ring-accent'

// ---------- Filtering ----------

function matches(query: string, ...names: (string | undefined)[]): boolean {
  const q = query.trim().toLowerCase()
  return q === '' || names.some((name) => name?.toLowerCase().includes(q))
}

// ---------- Layout ----------

// A titled group of rows that folds shut when its title is clicked. It
// stays shut as you select other elements (the view store remembers), but
// opens while you're filtering so matches can show. `action` sits on the
// right of the title, like "Convert to Scale".
export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  const closed = useViewStore((state) => state.closedSections.includes(title))
  const toggle = useViewStore((state) => state.toggleSection)
  const filtering = useContext(PropertyFilter).trim() !== ''
  const open = filtering || !closed
  return (
    <section className="border-b border-line">
      <div className="flex h-8 items-center justify-between pr-3 pl-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => toggle(title)}
          className="flex items-center gap-1 rounded text-[13px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ChevronIcon
            className={`text-faint transition-transform ${open ? 'rotate-90' : ''}`}
          />
          {title}
        </button>
        {action}
      </div>
      {open && <div className="space-y-1 px-3 pb-2.5">{children}</div>}
    </section>
  )
}

// A small amber text button on the right of a section title.
export function SectionAction({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="text-xs text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
    >
      {children}
    </button>
  )
}

// One property: its name on the left, its value on the right. `name` is
// the Roblox property it edits, if the label is shortened ("Transparency"
// for BackgroundTransparency); both count for the filter and the tooltip.
export function Row({
  label,
  name,
  indent = false,
  children,
}: {
  label: string
  name?: string
  indent?: boolean // a sub-row, like X and Y under Size
  children: ReactNode
}) {
  const query = useContext(PropertyFilter)
  if (!matches(query, label, name)) return null
  return (
    <div className="grid min-h-6 grid-cols-[100px_1fr] items-center gap-2">
      <span
        className={`truncate text-xs text-muted ${indent ? 'pl-3' : ''}`}
        title={name ?? label}
      >
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-1.5">{children}</div>
    </div>
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
    <p className={`py-0.5 text-[11px] ${warn ? 'text-warn' : 'text-faint'}`}>
      {children}
    </p>
  )
}

// ---------- Value boxes ----------

// A box showing a value as text (`format`) that you can type into. What
// you type is read with `parse` when you press Enter or click away; if it
// can't be read, the box goes back to the old value. Escape cancels.
export function TextValueField<T>({
  label,
  value,
  format,
  parse,
  onChange,
}: {
  label: string // for screen readers
  value: T
  format: (value: T) => string
  parse: (text: string) => T | null
  onChange: (value: T) => void
}) {
  // null = not editing, so the box shows the stored value.
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const parsed = parse(draft)
    if (parsed !== null) onChange(parsed)
    setDraft(null)
  }

  return (
    <input
      type="text"
      aria-label={label}
      spellCheck={false}
      className={inputClass}
      value={draft ?? format(value)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur() // blur commits
        if (event.key === 'Escape') setDraft(null)
      }}
    />
  )
}

// A number box. Half-typed text like "-" or "0." is fine while typing;
// it's read on Enter or click away, and kept between `min` and `max`.
export function NumberField({
  label,
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  integer = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  integer?: boolean // round to a whole number (pixels, ZIndex...)
}) {
  return (
    <TextValueField
      label={label}
      value={value}
      format={formatNumber}
      parse={(text) => {
        const parsed = parseNumberInput(text)
        if (parsed === null) return null
        return clamp(integer ? Math.round(parsed) : parsed, min, max)
      }}
      onChange={onChange}
    />
  )
}

// A text box that saves on every keystroke, so the canvas updates as you
// type (Text, PlaceholderText...).
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
      className={`${inputClass} font-sans`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...undoGroupWhileFocused}
    />
  )
}

// An on/off property, as an amber checkbox like Studio's.
export function ToggleField({
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
      checked={value}
      onChange={(event) => onChange(event.target.checked)}
      className="size-3.5 cursor-pointer accent-accent"
    />
  )
}

// A colour: a swatch that opens the browser's colour picker, and the colour
// as "42, 55, 87" (0–255, like Studio) that you can type into. A hex code
// like #2A3757 works too.
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: Color3
  onChange: (value: Color3) => void
}) {
  return (
    <>
      <input
        type="color"
        aria-label={`${label} picker`}
        className="size-5 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0 ring-1 ring-line [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        value={color3ToHex(value)}
        onChange={(event) => onChange(hexToColor3(event.target.value))}
        {...undoGroupWhileFocused}
      />
      <TextValueField
        label={label}
        value={value}
        format={formatColor3}
        parse={parseColor3}
        onChange={onChange}
      />
    </>
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
      className={`${inputClass} pr-1 font-sans`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels?.[option] ?? option}
        </option>
      ))}
    </select>
  )
}

// A UDim ("{0, 14}") on one row.
export function UDimRow({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name?: string
  value: UDim
  onChange: (value: UDim) => void
}) {
  return (
    <Row label={label} name={name}>
      <TextValueField
        label={name ?? label}
        value={value}
        format={formatUDim}
        parse={parseUDim}
        onChange={onChange}
      />
    </Row>
  )
}

// A UDim2 (Position, Size...) as Studio shows it, "{0.34, 0}, {0, 0}".
// The arrow by its name opens X and Y rows with separate Scale and Offset
// boxes, for when that's easier than typing the whole thing.
export function UDim2Row({
  label,
  value,
  onChange,
  startOpen = false,
}: {
  label: string // the Roblox property name, e.g. Size
  value: UDim2
  onChange: (value: UDim2) => void
  startOpen?: boolean
}) {
  const [open, setOpen] = useState(startOpen)
  const query = useContext(PropertyFilter)
  if (!matches(query, label)) return null

  const axis = (name: 'X' | 'Y', scale: 'xs' | 'ys', offset: 'xo' | 'yo') => (
    <Row label={name} indent>
      <span className="text-[11px] text-faint">Scale</span>
      <NumberField
        label={`${label} ${name} Scale`}
        value={value[scale]}
        onChange={(v) => onChange({ ...value, [scale]: v })}
      />
      <span className="text-[11px] text-faint">Offset</span>
      <NumberField
        label={`${label} ${name} Offset`}
        integer
        value={value[offset]}
        onChange={(v) => onChange({ ...value, [offset]: v })}
      />
    </Row>
  )

  return (
    <>
      <div className="grid min-h-6 grid-cols-[100px_1fr] items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          title={`${label}: show X and Y separately`}
          className="flex items-center gap-0.5 truncate text-left text-xs text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ChevronIcon
            className={`-ml-0.5 shrink-0 text-faint transition-transform ${open ? 'rotate-90' : ''}`}
          />
          {label}
        </button>
        <TextValueField
          label={label}
          value={value}
          format={formatUDim2}
          parse={parseUDim2}
          onChange={onChange}
        />
      </div>
      {open && (
        <>
          {axis('X', 'xs', 'xo')}
          {axis('Y', 'ys', 'yo')}
        </>
      )}
    </>
  )
}
