// Small line icons, drawn as inline SVG so we don't need an icon library.
// Each is 14px unless given a `size`, and takes its color from the text
// around it (stroke="currentColor").

import type { ReactNode } from 'react'

type IconProps = { className?: string; size?: number }

function Icon({
  className,
  size = 14,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M6 4l4 4-4 4" />
    </Icon>
  )
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <path d="M2.5 13.5l11-11" />
    </Icon>
  )
}

export function LockIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
    </Icon>
  )
}

// ---- Top bar and dialogs

// The select tool: an arrow pointer.
export function CursorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 2.5l9 5-4 1-1.5 4.5z" />
    </Icon>
  )
}

// The hand tool, for panning.
export function HandIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 8V3.5a1 1 0 012 0V7m0-1.5V2.5a1 1 0 012 0V7m0-3a1 1 0 012 0v3.5m0-1.5a1 1 0 012 0V10a4.5 4.5 0 01-4.5 4.5H8a4 4 0 01-3.2-1.6L2.6 10a1 1 0 011.5-1.3L5 9.5" />
    </Icon>
  )
}

export function UndoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 3L2.5 6l3 3" />
      <path d="M2.5 6h7a4 4 0 010 8H7" />
    </Icon>
  )
}

export function RedoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.5 3l3 3-3 3" />
      <path d="M13.5 6h-7a4 4 0 000 8H9" />
    </Icon>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2.5v8M4.5 7L8 10.5 11.5 7" />
      <path d="M2.5 13.5h11" />
    </Icon>
  )
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V3.5a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h2" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6l4 4 4-4" />
    </Icon>
  )
}

// Udimo's logo mark: a screen with a UI panel on it.
export function LogoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="12" height="9" rx="2" />
      <path d="M5 14h6M5.5 6.5h5M5.5 9h3" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3v10M3 8h10" />
    </Icon>
  )
}

// Magnifying glasses for zooming out and in.
export function ZoomOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14M5 7h4" />
    </Icon>
  )
}

export function ZoomInIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14M5 7h4M7 5v4" />
    </Icon>
  )
}

// Collapse everything: an upward chevron.
export function CollapseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10l4-4 4 4" />
    </Icon>
  )
}
