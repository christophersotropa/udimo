import type { FontFace } from './fonts.ts'

// How big text is, for the sizing maths that needs it (AutomaticSize
// growing an element to fit its text, layout.ts). Only a browser can
// measure text, and model/ stays plain TypeScript, so the measuring is
// handed in from outside: the editor sets the browser's real measurements
// when it starts (main.tsx), and everything else, tests included, gets a
// simple estimate that's the same everywhere.

export type TextMetrics = {
  // How wide `text` is in this font at `size` pixels.
  width: (text: string, font: FontFace, size: number) => number
  // How tall one line is per pixel of text size: the letters plus the
  // room the font keeps above and below them (about 1.26 for Source Sans).
  lineHeight: (font: FontFace) => number
}

// The estimate: every character half the text size wide, lines 1.25 times
// the text size tall. Rough, but predictable, which is what tests need.
export const ESTIMATED_METRICS: TextMetrics = {
  width: (text, _font, size) => text.length * size * 0.5,
  lineHeight: () => 1.25,
}

let current: TextMetrics = ESTIMATED_METRICS

export function setTextMetrics(metrics: TextMetrics) {
  current = metrics
}

export function textMetrics(): TextMetrics {
  return current
}
