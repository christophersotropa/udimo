// Udimo's logo: an outlined square with a filled amber square overlapping
// its corner, like a UI element dropped onto a screen. Drawn on a 32 × 32
// grid. The outline takes the text color around it (currentColor), so it
// stays visible on any background; the filled square is the logo amber.
// public/logo.svg is the same drawing, for the browser tab.
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="2.5"
        y="2.5"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <rect x="11" y="11" width="20" height="20" fill="#f0a93b" />
    </svg>
  )
}
