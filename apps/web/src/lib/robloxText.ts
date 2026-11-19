import type { Color3, UDim, UDim2, Vector2 } from '../model/types.ts'
import { parseHexColor } from './color.ts'
import { formatNumber } from './numbers.ts'

// Roblox values written as text, the way Studio's Properties window shows
// them, and read back from what you type:
//   UDim2    {0.34, 0}, {0, 0}      ({X Scale, X Offset}, {Y Scale, Y Offset})
//   UDim     {0, 14}
//   Vector2  0.5, 0.5
//   Color3   42, 55, 87             (0 to 255, like Studio; #2A3757 works too)
// Reading is forgiving: any brackets, commas or spaces are fine, as long as
// there are the right number of numbers.

// Every number in a piece of text, in order: "{0.5, -4}" gives [0.5, -4].
function numbersIn(text: string): number[] {
  return (text.match(/-?(\d+\.?\d*|\.\d+)(e-?\d+)?/gi) ?? []).map(Number)
}

const n = formatNumber

export function formatUDim2(v: UDim2): string {
  return `{${n(v.xs)}, ${n(v.xo)}}, {${n(v.ys)}, ${n(v.yo)}}`
}

// Offsets are whole pixels in Roblox, so they're rounded.
export function parseUDim2(text: string): UDim2 | null {
  const values = numbersIn(text)
  if (values.length !== 4) return null
  const [xs, xo, ys, yo] = values
  return { xs, xo: Math.round(xo), ys, yo: Math.round(yo) }
}

export function formatUDim(v: UDim): string {
  return `{${n(v.s)}, ${n(v.o)}}`
}

export function parseUDim(text: string): UDim | null {
  const values = numbersIn(text)
  if (values.length !== 2) return null
  return { s: values[0], o: Math.round(values[1]) }
}

export function formatVector2(v: Vector2): string {
  return `${n(v.x)}, ${n(v.y)}`
}

export function parseVector2(text: string): Vector2 | null {
  const values = numbersIn(text)
  if (values.length !== 2) return null
  return { x: values[0], y: values[1] }
}

const to255 = (channel: number) => Math.round(channel * 255)

export function formatColor3(c: Color3): string {
  return `${to255(c.r)}, ${to255(c.g)}, ${to255(c.b)}`
}

// Three numbers from 0 to 255 (kept in range), or a hex code.
export function parseColor3(text: string): Color3 | null {
  if (text.trim().startsWith('#')) return parseHexColor(text)
  const values = numbersIn(text)
  if (values.length !== 3) return null
  const [r, g, b] = values.map(
    (v) => Math.min(255, Math.max(0, Math.round(v))) / 255,
  )
  return { r, g, b }
}
