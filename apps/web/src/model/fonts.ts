// The fonts Udimo offers. Each has:
//   family: the font family Roblox saves in FontFace, checked against
//           docs/reference/fonts.rbxmx (Builder Sans is a cloud font, so it
//           has an asset id instead of a built-in file)
//   css:    how the canvas shows it. Open-source web copies are bundled
//           (the @fontsource packages, loaded in main.tsx). Builder Sans
//           isn't public, so a system font stands in; Arial uses the
//           computer's own Arial.
//   bold:   whether Roblox has a Bold weight for it
export const FONTS = {
  SourceSansPro: {
    label: 'Source Sans Pro',
    family: 'rbxasset://fonts/families/SourceSansPro.json',
    css: '"Source Sans 3", sans-serif',
    bold: true,
  },
  BuilderSans: {
    label: 'Builder Sans',
    family: 'rbxassetid://16658221428',
    css: 'system-ui, sans-serif',
    bold: true,
  },
  FredokaOne: {
    label: 'Fredoka One',
    family: 'rbxasset://fonts/families/FredokaOne.json',
    css: '"Fredoka One", sans-serif',
    bold: false,
  },
  LuckiestGuy: {
    label: 'Luckiest Guy',
    family: 'rbxasset://fonts/families/LuckiestGuy.json',
    css: '"Luckiest Guy", sans-serif',
    bold: false,
  },
  Roboto: {
    label: 'Roboto',
    family: 'rbxasset://fonts/families/Roboto.json',
    css: 'Roboto, sans-serif',
    bold: true,
  },
  Arial: {
    label: 'Arimo (Arial)',
    family: 'rbxasset://fonts/families/Arial.json',
    css: 'Arial, Arimo, "Liberation Sans", sans-serif',
    bold: true,
  },
} as const

export type FontId = keyof typeof FONTS
export const FONT_IDS = Object.keys(FONTS) as FontId[]
