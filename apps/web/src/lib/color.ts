import type { Color3 } from '../model/types.ts'

// Roblox Color3 (0 to 1 per channel) from the 0 to 255 numbers you see in
// Studio's color picker, e.g. rgb(163, 162, 165).
export function color3FromRgb(r: number, g: number, b: number): Color3 {
  return { r: r / 255, g: g / 255, b: b / 255 }
}

// A Color3 plus a Roblox transparency (0 solid, 1 invisible) as a CSS color.
// CSS uses the opposite idea, alpha (1 solid, 0 invisible), so alpha = 1 - transparency.
export function color3ToCss(color: Color3, transparency = 0): string {
  const to255 = (channel: number) => Math.round(channel * 255)
  const alpha = 1 - transparency
  return `rgb(${to255(color.r)} ${to255(color.g)} ${to255(color.b)} / ${alpha})`
}
