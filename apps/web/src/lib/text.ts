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

// How many lines some words take when wrapped to `maxWidth`, the way
// TextWrapped does it: as many words as fit on each line, then the next
// line. `wordWidths` are the words' widths and `spaceWidth` the gap between
// them, all at the same text size. A word wider than the line gets a line
// of its own.
export function wrappedLineCount(
  wordWidths: number[],
  spaceWidth: number,
  maxWidth: number,
): number {
  let lines = 1
  let used = 0
  for (const width of wordWidths) {
    const needed = used === 0 ? width : used + spaceWidth + width
    if (used > 0 && needed > maxWidth + 0.01) {
      lines++
      used = width
    } else {
      used = needed
    }
  }
  return lines
}

// TextScaled with TextWrapped on: the biggest whole text size at which the
// text, wrapped to the area's width, fits the area's height, with every
// word fitting on a line. `paragraphs` has, for each line you typed, its
// words' widths at text size 1; `spaceWidth` is a space's width at size 1.
// `lineHeight`: one line's height per pixel of text size (see above).
export function scaledWrappedTextSize(
  paragraphs: number[][],
  spaceWidth: number,
  area: ScreenSize,
  lineHeight = 1,
): number {
  const widestWord = Math.max(0, ...paragraphs.flat())
  for (let size = MAX_TEXT_SIZE; size > 1; size--) {
    if (widestWord * size > area.width) continue
    const lines = paragraphs.reduce(
      (total, words) =>
        total +
        wrappedLineCount(
          words.map((width) => width * size),
          spaceWidth * size,
          area.width,
        ),
      0,
    )
    if (lines * lineHeight * size <= area.height) return size
  }
  return 1
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
