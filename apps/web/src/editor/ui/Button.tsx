import type { ButtonHTMLAttributes, ReactNode } from 'react'

// The editor's buttons. Every button uses one of these, so they all look
// and behave the same, and restyling one place restyles them all.

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const VARIANTS = {
  // The main action on screen (Export, Download).
  primary: 'bg-accent font-semibold text-accent-ink hover:bg-accent-hover',
  // Ordinary actions, with a border.
  secondary: 'bg-raised text-ink ring-1 ring-line hover:bg-hover',
  // Quiet actions in toolbars and menus.
  ghost: 'text-muted hover:bg-hover hover:text-ink',
} as const

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS
  icon?: ReactNode // shown before the text
}

export function Button({
  variant = 'secondary',
  icon,
  className = '',
  children,
  ...rest // every other <button> attribute, passed straight through
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-7 items-center justify-center gap-1.5 rounded px-3 text-body disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${FOCUS} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

// A square button with only an icon. `label` is read out by screen
// readers and shown as a tooltip, since there's no visible text.
export function IconButton({
  label,
  active = false,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  active?: boolean // e.g. the current tool
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`inline-flex size-7 items-center justify-center rounded disabled:pointer-events-none disabled:opacity-40 ${
        active
          ? 'bg-accent-soft text-accent'
          : 'text-muted hover:bg-hover hover:text-ink'
      } ${FOCUS} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
