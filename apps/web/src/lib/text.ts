import type { ScreenSize } from '../model/screen.ts'

// Roblox caps text at 100 pixels, TextScaled included.
export const MAX_TEXT_SIZE = 100

// TextScaled: the biggest whole text size at which every line fits in
// `area`. `widthPerPixel` is how wide the widest line is per pixel of text
// size (its width at size 1).
//
// `lineHeight` is how tall one line is per pixel of text size: the letters
// plus the room the font keeps above and below them (about 1.26 for Source
// Sans). Roblox fits whole lines into the box: in Studio, a TextScaled
// label 24px tall reports TextBounds 24px tall, while its text size is
// about 19 (checked in build 33).
export function scaledTextSize(
  widthPerPixel: number,
  lineCount: number,
  area: ScreenSize,
  lineHeight = 1,
): number {
  const byHeight = area.height / (Math.max(1, lineCount) * lineHeight)
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

// How tall one line of a CSS font is per pixel of text size, from the
// font's own ascent and descent (browsers only). `cssFont` should be at
// 100px, like "700 100px Roboto". Falls back to 1.2, a typical value, if
// the browser can't say.
export function measureLineHeight(cssFont: string): number {
  measurer ??= document.createElement('canvas').getContext('2d')
  if (!measurer) return 1.2
  measurer.font = cssFont
  const metrics = measurer.measureText('Mg')
  const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
  return Number.isFinite(height) && height > 0 ? height / 100 : 1.2
}
