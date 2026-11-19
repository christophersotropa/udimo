import type { ScreenSize } from '../model/screen.ts'

// Roblox caps text at 100 pixels, TextScaled included.
export const MAX_TEXT_SIZE = 100

// TextScaled: the biggest whole text size at which every line fits in
// `area`. `widthPerPixel` is how wide the widest line is per pixel of text
// size (its width at size 1). Lines are one text size tall each.
export function scaledTextSize(
  widthPerPixel: number,
  lineCount: number,
  area: ScreenSize,
): number {
  const byHeight = area.height / Math.max(1, lineCount)
  const byWidth = widthPerPixel > 0 ? area.width / widthPerPixel : Infinity
  return Math.max(1, Math.floor(Math.min(MAX_TEXT_SIZE, byHeight, byWidth)))
}

// How wide `text` is in a CSS font like "700 100px Roboto", measured with
// an off-screen <canvas> (browsers only). Made once and reused.
let measurer: CanvasRenderingContext2D | null = null
export function measureTextWidth(text: string, cssFont: string): number {
  measurer ??= document.createElement('canvas').getContext('2d')
  if (!measurer) return 0
  measurer.font = cssFont
  return measurer.measureText(text).width
}
