import type { ScreenSize } from '../model/screen.ts'

// The smallest window the editor works in. Measured, not guessed:
//   - narrower than 800px, the top bar's name runs into the menus (at
//     760px they touch, at 680px they overlap), and with the panels at
//     their usual widths the canvas is left under 280px;
//   - shorter than 480px (a phone on its side is about 390), the panels
//     have room for only a few rows under their headers.
// Below either, SmallScreenNotice covers the editor and says why.
export const MIN_EDITOR_WIDTH = 800
export const MIN_EDITOR_HEIGHT = 480

export function tooSmallForEditor(window: ScreenSize): boolean {
  return window.width < MIN_EDITOR_WIDTH || window.height < MIN_EDITOR_HEIGHT
}
