import type { ReactNode } from 'react'
import type { ClassName, ModifierClass } from '../../model/types.ts'

// A small outline icon for each kind of object, in the Explorer and the
// Insert list, coloured by family so you can tell kinds apart at a glance:
// containers blue, text green, buttons rose (they're what players press),
// images violet, modifiers grey, and the screen itself in plain ink. None
// of them is the accent, so a class colour never looks like selection.
const SHAPES: Record<ClassName | 'Modifier', ReactNode> = {
  // A monitor: the whole screen.
  ScreenGui: (
    <>
      <rect x="2" y="3" width="12" height="8.5" rx="1" />
      <path d="M6 14h4M8 11.5V14" />
    </>
  ),
  Frame: <rect x="3" y="3" width="10" height="10" rx="1" />,
  // A frame with a scroll bar.
  ScrollingFrame: (
    <>
      <rect x="3" y="3" width="10" height="10" rx="1" />
      <path d="M10.5 5.5v3" />
    </>
  ),
  TextLabel: <path d="M4 4h8M8 4v9" />,
  // A box with a text cursor in it.
  TextBox: (
    <>
      <rect x="2" y="4.5" width="12" height="7" rx="1" />
      <path d="M5.5 6.5v3" />
    </>
  ),
  TextButton: <rect x="2" y="5" width="12" height="6" rx="3" />,
  ImageLabel: (
    <>
      <rect x="2.5" y="3" width="11" height="10" rx="1" />
      <path d="M3 12l3.5-3.5 2.5 2.5 2-2 2.5 2.5" />
    </>
  ),
  // A picture that's also a button.
  ImageButton: (
    <>
      <rect x="2" y="3.5" width="12" height="9" rx="3" />
      <path d="M4.5 10.5l2.5-2.5 2 2 1.5-1.5 1.5 1.5" />
    </>
  ),
  // A diamond for every modifier (UICorner, UIListLayout...).
  Modifier: <path d="M8 3l5 5-5 5-5-5z" />,
}

const COLORS: Record<ClassName | 'Modifier', string> = {
  ScreenGui: 'text-ink',
  Frame: 'text-sky-400',
  ScrollingFrame: 'text-sky-400',
  TextLabel: 'text-emerald-400',
  TextBox: 'text-emerald-400',
  TextButton: 'text-rose-300',
  ImageButton: 'text-rose-300',
  ImageLabel: 'text-violet-400',
  Modifier: 'text-faint',
}

export function ClassIcon({
  className,
}: {
  className: ClassName | ModifierClass
}) {
  const kind = className in SHAPES ? (className as ClassName) : 'Modifier'
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${COLORS[kind]}`}
    >
      {SHAPES[kind]}
    </svg>
  )
}
