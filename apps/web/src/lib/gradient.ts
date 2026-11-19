import type { Color3, ModifierProps } from '../model/types.ts'
import { color3ToCss } from './color.ts'
import { colorAt, numberAt } from './sequence.ts'

// A UIGradient on an element's background, as a CSS linear-gradient.
//
// Roblox multiplies: each point's color is the background color times the
// gradient's color there, and its opacity is the background's opacity
// times the gradient's. (So on the default white background, you see the
// gradient's own colors.) The gradient's color and transparency keypoints
// can sit at different times, so a CSS color stop is made at every one.
export function gradientCss(
  background: Color3,
  backgroundTransparency: number,
  gradient: Required<ModifierProps['UIGradient']>,
): string {
  const times = [
    ...new Set([
      ...gradient.Color.map((k) => k.time),
      ...gradient.Transparency.map((k) => k.time),
    ]),
  ].sort((a, b) => a - b)

  const stops = times.map((time) => {
    const tint = colorAt(gradient.Color, time)
    const color = {
      r: background.r * tint.r,
      g: background.g * tint.g,
      b: background.b * tint.b,
    }
    const opacity =
      (1 - backgroundTransparency) * (1 - numberAt(gradient.Transparency, time))
    return `${color3ToCss(color, 1 - opacity)} ${time * 100}%`
  })

  // Roblox's Rotation 0 runs left to right and turns clockwise. CSS angles
  // start pointing up (0deg) and also turn clockwise, so right is 90deg.
  return `linear-gradient(${90 + gradient.Rotation}deg, ${stops.join(', ')})`
}
