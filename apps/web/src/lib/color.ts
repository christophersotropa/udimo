import type { Color3 } from '../model/types.ts'

// Roblox Color3 (0 to 1 per channel) from the 0 to 255 numbers you see in
// Studio's color picker, e.g. rgb(163, 162, 165).
export function color3FromRgb(r: number, g: number, b: number): Color3 {
  return { r: r / 255, g: g / 255, b: b / 255 }
}

// Hex colors like "#ff8000" are what the browser's color picker uses:
// two hex digits (00 to ff, so 0 to 255) each for red, green and blue.
export function color3ToHex(color: Color3): string {
  const toHex = (channel: number) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`
}

export function hexToColor3(hex: string): Color3 {
  const channel = (start: number) => parseInt(hex.slice(start, start + 2), 16)
  return color3FromRgb(channel(1), channel(3), channel(5))
}

// A Color3 plus a Roblox transparency (0 solid, 1 invisible) as a CSS color.
// CSS uses the opposite idea, alpha (1 solid, 0 invisible), so alpha = 1 - transparency.
export function color3ToCss(color: Color3, transparency = 0): string {
  const to255 = (channel: number) => Math.round(channel * 255)
  const alpha = 1 - transparency
  return `rgb(${to255(color.r)} ${to255(color.g)} ${to255(color.b)} / ${alpha})`
}

// A hex color someone typed ("#2A3757", "2a3757", "#fff"), or null if it
// isn't one. The 3-digit form doubles each digit, like CSS.
export function parseHexColor(text: string): Color3 | null {
  let hex = text.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = [...hex].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null
  return hexToColor3(`#${hex}`)
}
