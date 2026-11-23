import type { ScreenSize } from '../model/screen.ts'
import { MIN_EDITOR_HEIGHT, MIN_EDITOR_WIDTH } from './smallScreen.ts'
import { Logo } from './topbar/Logo.tsx'
import { Button } from './ui/Button.tsx'

// Covers the editor when the window is too small for it (smallScreen.ts),
// say on a phone, instead of letting the panels spill off the screen. The
// editor stays loaded underneath, so making the window bigger brings it
// straight back as it was.
export function SmallScreenNotice({
  size,
  onContinue,
}: {
  size: ScreenSize
  onContinue: () => void // "Continue anyway": hides it until a reload
}) {
  return (
    // role="dialog" with aria-modal: screen readers treat it as the whole
    // page for now (the editor behind it is made inert in App).
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="small-screen-title"
      data-small-screen
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-app p-6"
    >
      <div className="max-w-sm">
        <Logo size={28} />
        <h1
          id="small-screen-title"
          className="mt-5 text-xl font-semibold text-balance text-ink"
        >
          Udimo needs a bigger window
        </h1>
        {/* 16px body text here: on a phone, smaller is hard to read. */}
        <p className="mt-3 text-base text-pretty text-muted">
          The editor needs at least {MIN_EDITOR_WIDTH} × {MIN_EDITOR_HEIGHT}{' '}
          pixels, so the canvas has room between the Explorer and Properties.
          This window is {size.width} × {size.height}.
        </p>
        <p className="mt-3 text-base text-pretty text-muted">
          Make the window bigger, or open Udimo on a computer. Your work so far
          is saved in this browser.
        </p>
        <Button
          // The one thing to do here, so it starts focused for the keyboard.
          autoFocus
          onClick={onContinue}
          className="mt-6 min-h-11 px-4" // 44px tall: easy to tap on a phone
        >
          Continue anyway
        </Button>
      </div>
    </div>
  )
}
