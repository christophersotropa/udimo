import type { ButtonHTMLAttributes, ReactNode } from 'react'

// The editor's buttons. Every button uses one of these, so they all look
// and behave the same, and restyling one place restyles them all.

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const VARIANTS = {
  // The main action on screen (Export, Download).
  primary: 'bg-accent text-white hover:bg-accent-hover',
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
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${FOCUS} ${className}`}
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
      className={`inline-flex size-8 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-40 ${
        active
          ? 'bg-accent text-white'
          : 'text-muted hover:bg-hover hover:text-ink'
      } ${FOCUS} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
