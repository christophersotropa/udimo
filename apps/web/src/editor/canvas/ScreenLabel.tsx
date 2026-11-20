import type { ReactNode } from 'react'

// A small label pinned to a point on the game screen (in game pixels) that
// stays the same size on screen at any zoom. The screen is zoomed with
// transform: scale(zoom), so the label is scaled by 1 / zoom to undo it.
//
// `side` says where it sits around the point. The transform first shifts
// the label so the point is at its middle (or corner), then scales it
// around that point, so the point stays put.
const SIDES = {
  above: {
    box: 'left-0 bottom-0 pb-1',
    origin: 'bottom left',
    shift: 'translateX(-50%)',
  },
  left: {
    box: 'right-0 top-0 pr-1',
    origin: 'top right',
    shift: 'translateY(-50%)',
  },
  below: {
    box: 'left-0 top-0 pt-1.5',
    origin: 'top left',
    shift: 'translateX(-50%)',
  },
} as const

export function ScreenLabel({
  x,
  y,
  side,
  tone = 'accent',
  children,
}: {
  x: number
  y: number
  side: keyof typeof SIDES
  tone?: 'accent' | 'guide'
  children: ReactNode
}) {
  const place = SIDES[side]
  return (
    // A zero-size anchor at the point; the label hangs off it.
    <div className="absolute size-0" style={{ left: x, top: y }}>
      <div
        className={`absolute ${place.box}`}
        style={{
          transformOrigin: place.origin,
          transform: `scale(calc(1 / var(--canvas-scale))) ${place.shift}`,
        }}
      >
        <span
          className={`block rounded-sm px-1 py-px font-mono text-note whitespace-nowrap ${
            tone === 'guide'
              ? 'bg-guide text-white'
              : 'bg-accent text-accent-ink'
          }`}
        >
          {children}
        </span>
      </div>
    </div>
  )
}
