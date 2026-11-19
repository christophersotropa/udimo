// Roblox enums Udimo uses. The document stores the readable name
// ("Vertical"); the .rbxmx file stores the number ("token"), as Roblox does.
// Each table maps name -> number, matching Studio's own files.

// How siblings stack. Sibling: children draw above their parent.
export const Z_INDEX_BEHAVIOR = { Global: 0, Sibling: 1 } as const
export const FILL_DIRECTION = { Horizontal: 0, Vertical: 1 } as const
export const HORIZONTAL_ALIGNMENT = { Center: 0, Left: 1, Right: 2 } as const
export const VERTICAL_ALIGNMENT = { Center: 0, Top: 1, Bottom: 2 } as const
// "Custom" is an old option Roblox keeps for compatibility; Udimo treats it
// like the tree order.
export const SORT_ORDER = { Name: 0, Custom: 1, LayoutOrder: 2 } as const
// Where Roblox's border sits: outside the edges, on them, or inside.
// Udimo always uses Outline, Roblox's default.
export const BORDER_MODE = { Outline: 0, Middle: 1, Inset: 2 } as const

// How thick a font is: Roblox's FontWeight, named and numbered as Roblox
// does. Each font offers only some of these (FONTS in fonts.ts lists
// which); a weight it lacks is drawn as its closest (closestWeight).
export const FONT_WEIGHT = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Heavy: 900,
} as const
// Upright or slanted text (Roblox's FontStyle).
export const FONT_STYLE = { Normal: 0, Italic: 1 } as const
// UIStroke on a text element: outline the text (Contextual) or the box.
export const APPLY_STROKE_MODE = { Contextual: 0, Border: 1 } as const

export type FillDirection = keyof typeof FILL_DIRECTION
export type HorizontalAlignment = keyof typeof HORIZONTAL_ALIGNMENT
export type VerticalAlignment = keyof typeof VERTICAL_ALIGNMENT
export type SortOrder = keyof typeof SORT_ORDER
export type ApplyStrokeMode = keyof typeof APPLY_STROKE_MODE
export type FontWeight = keyof typeof FONT_WEIGHT
export type FontStyle = keyof typeof FONT_STYLE

// The names of an enum, for dropdowns and file checks.
export function enumNames<T extends Record<string, number>>(table: T) {
  return Object.keys(table) as (keyof T & string)[]
}
