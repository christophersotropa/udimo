import type { ReactNode } from 'react'
import { CheckIcon } from '../panels/icons.tsx'

// A checkbox input drawn by us (.check-box, index.css): a dark box like
// the text boxes, with a tick in the accent colour when it's on. The tick
// is an icon laid over the box rather than a picture inside its CSS, so it
// follows the accent token (a picture can't read CSS variables).
export function CheckBoxInput({
  checked,
  onChange,
  label,
  size = 16,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string // for a box with no visible label of its own
  size?: number // in pixels
}) {
  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="check-box size-full"
      />
      {checked && (
        <CheckIcon
          size={size - 2}
          className="pointer-events-none absolute inset-0 m-auto text-accent"
        />
      )}
    </span>
  )
}

// A checkbox with a label and an optional line of explanation, the whole
// row clickable (a <label> around the input does that).
export function Checkbox({
  checked,
  onChange,
  children,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  description?: string
}) {
  return (
    <label className="flex cursor-pointer gap-2.5">
      <span className="mt-0.5 flex">
        <CheckBoxInput checked={checked} onChange={onChange} />
      </span>
      <span>
        <span className="block text-body text-ink">{children}</span>
        {description && (
          <span className="block text-xs text-muted">{description}</span>
        )}
      </span>
    </label>
  )
}
