// Small line icons for the panels, drawn as inline SVG so we don't need an
// icon library. Each is 14px and takes its color from the text around it
// (stroke="currentColor").

import type { ReactNode } from 'react'

type IconProps = { className?: string }

function Icon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
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

export function EyeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
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

export function UnlockIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 014.9-.7" />
    </Icon>
  )
}
