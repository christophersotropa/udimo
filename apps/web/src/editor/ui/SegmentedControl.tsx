// A row of joined buttons where exactly one is chosen, like PC / Tablet /
// Phone. It works like radio buttons, so screen readers announce it so.
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded bg-app p-0.5 ring-1 ring-line"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={`h-6 rounded-sm px-3 text-body focus-visible:outline-2 focus-visible:outline-accent ${
            option.value === value
              ? 'bg-hover text-ink'
              : 'text-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
