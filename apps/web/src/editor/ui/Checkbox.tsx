import type { ReactNode } from 'react'

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
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="check-box mt-0.5 size-4 shrink-0"
      />
      <span>
        <span className="block text-[13px] text-ink">{children}</span>
        {description && (
          <span className="block text-xs text-muted">{description}</span>
        )}
      </span>
    </label>
  )
}
