// Roblox enums Udimo uses. The document stores the readable name
// ("Vertical"); the .rbxmx file stores the number ("token"), as Roblox does.
// Each table maps name -> number, matching Studio's own files.

export const FILL_DIRECTION = { Horizontal: 0, Vertical: 1 } as const
export const HORIZONTAL_ALIGNMENT = { Center: 0, Left: 1, Right: 2 } as const
export const VERTICAL_ALIGNMENT = { Center: 0, Top: 1, Bottom: 2 } as const
// "Custom" is an old option Roblox keeps for compatibility; Udimo treats it
// like the tree order.
export const SORT_ORDER = { Name: 0, Custom: 1, LayoutOrder: 2 } as const
// UIStroke on a text element: outline the text (Contextual) or the box.
export const APPLY_STROKE_MODE = { Contextual: 0, Border: 1 } as const

export type FillDirection = keyof typeof FILL_DIRECTION
export type HorizontalAlignment = keyof typeof HORIZONTAL_ALIGNMENT
export type VerticalAlignment = keyof typeof VERTICAL_ALIGNMENT
export type SortOrder = keyof typeof SORT_ORDER
export type ApplyStrokeMode = keyof typeof APPLY_STROKE_MODE

// The names of an enum, for dropdowns and file checks.
export function enumNames<T extends Record<string, number>>(table: T) {
  return Object.keys(table) as (keyof T & string)[]
}
