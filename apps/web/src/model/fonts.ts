import { FONT_WEIGHT, type FontStyle, type FontWeight } from './enums.ts'

// The fonts Udimo offers. Each has:
//   family:  the font family Roblox saves in FontFace, checked against
//            docs/reference/fonts.rbxmx (Builder Sans is a cloud font, so
//            it has an asset id instead of a built-in file)
//   css:     how the canvas shows it. Open-source web copies are bundled
//            (the @fontsource packages, loaded in main.tsx). Builder Sans
//            isn't public, so a system font stands in; Arial uses the
//            computer's own Arial.
//   weights: exactly the weights Studio's Weight dropdown offers for it,
//            lightest first (checked in Studio, build 44)
export const FONTS = {
  SourceSansPro: {
    label: 'Source Sans Pro',
    family: 'rbxasset://fonts/families/SourceSansPro.json',
    css: '"Source Sans 3", sans-serif',
    weights: ['ExtraLight', 'Light', 'Regular', 'SemiBold', 'Bold', 'Heavy'],
  },
  BuilderSans: {
    label: 'Builder Sans',
    family: 'rbxassetid://16658221428',
    css: 'system-ui, sans-serif',
    weights: [
      'Thin',
      'Light',
      'Regular',
      'Medium',
      'SemiBold',
      'Bold',
      'ExtraBold',
    ],
  },
  FredokaOne: {
    label: 'Fredoka One',
    family: 'rbxasset://fonts/families/FredokaOne.json',
    css: '"Fredoka One", sans-serif',
    weights: ['Regular'],
  },
  LuckiestGuy: {
    label: 'Luckiest Guy',
    family: 'rbxasset://fonts/families/LuckiestGuy.json',
    css: '"Luckiest Guy", sans-serif',
    weights: ['Regular'],
  },
  Roboto: {
    label: 'Roboto',
    family: 'rbxasset://fonts/families/Roboto.json',
    css: 'Roboto, sans-serif',
    weights: ['Thin', 'Light', 'Regular', 'Medium', 'Bold', 'Heavy'],
  },
  Arial: {
    label: 'Arimo (Arial)',
    family: 'rbxasset://fonts/families/Arial.json',
    css: 'Arial, Arimo, "Liberation Sans", sans-serif',
    weights: ['Regular', 'Medium', 'SemiBold', 'Bold'],
  },
} as const satisfies Record<
  string,
  { label: string; family: string; css: string; weights: readonly FontWeight[] }
>

export type FontId = keyof typeof FONTS
export const FONT_IDS = Object.keys(FONTS) as FontId[]

// A FontFace: which font, how thick, and whether it's italic. Files from
// before italic existed have no style, which means Normal.
export type FontFace = { family: FontId; weight: FontWeight; style?: FontStyle }

// The names Studio shows in its Weight dropdown: spaced, and "Black" for
// 900 (Roblox's FontWeight enum calls it Heavy; files store the number).
export const WEIGHT_LABELS: Record<FontWeight, string> = {
  Thin: 'Thin',
  ExtraLight: 'Extra Light',
  Light: 'Light',
  Regular: 'Regular',
  Medium: 'Medium',
  SemiBold: 'Semi Bold',
  Bold: 'Bold',
  ExtraBold: 'Extra Bold',
  Heavy: 'Black',
}

// The weight a font really draws when asked for `weight`: that weight if
// the font has it, otherwise the nearest one it has. A tie goes to the
// lighter one up to Medium (500) and the heavier one above, the way
// browsers choose.
export function closestWeight(family: FontId, weight: FontWeight): FontWeight {
  const wanted = FONT_WEIGHT[weight]
  const available: readonly FontWeight[] = FONTS[family].weights
  return available.reduce((best, candidate) => {
    const gap = Math.abs(FONT_WEIGHT[candidate] - wanted)
    const bestGap = Math.abs(FONT_WEIGHT[best] - wanted)
    if (gap < bestGap) return candidate
    if (gap > bestGap) return best
    const lighter = FONT_WEIGHT[candidate] < FONT_WEIGHT[best]
    return lighter === wanted <= 500 ? candidate : best
  })
}

// A FontFace as it will really look: a weight the font has, and a style.
export function resolveFontFace(face: FontFace): Required<FontFace> {
  return {
    family: face.family,
    weight: closestWeight(face.family, face.weight),
    style: face.style ?? 'Normal',
  }
}

// A FontFace as CSS font text at `size` pixels, like "italic 700 24px
// Roboto, sans-serif": for the canvas, and for measuring text.
export function fontCss(face: FontFace, size: number): string {
  const { family, weight, style } = resolveFontFace(face)
  const italic = style === 'Italic' ? 'italic ' : ''
  return `${italic}${FONT_WEIGHT[weight]} ${size}px ${FONTS[family].css}`
}
