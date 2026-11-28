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
// Where text sits in its box, across and down. Roblox centers both by
// default. (Numbered as Studio saves them: docs/reference/text-options.rbxmx.)
export const TEXT_X_ALIGNMENT = { Left: 0, Right: 1, Center: 2 } as const
export const TEXT_Y_ALIGNMENT = { Top: 0, Center: 1, Bottom: 2 } as const
// Text that doesn't fit is cut off with "…": never, at the end of a word,
// or partway through a word.
export const TEXT_TRUNCATE = { None: 0, AtEnd: 1, SplitWord: 2 } as const
// How an image fills its element (docs/reference/image-options.rbxmx):
// stretched to fill, 9-slice (corners kept, middle stretched), tiled,
// fitted inside (whole image, keeping its shape) or cropped to cover.
export const SCALE_TYPE = {
  Stretch: 0,
  Slice: 1,
  Tile: 2,
  Fit: 3,
  Crop: 4,
} as const
// How a UIPageLayout's page turn moves (docs/reference/ui-page-layout.rbxmx):
// the shape of the motion, and whether it eases at the start (In), the
// end (Out) or both. The same enums TweenService uses.
export const EASING_STYLE = {
  Linear: 0,
  Sine: 1,
  Back: 2,
  Quad: 3,
  Quart: 4,
  Quint: 5,
  Bounce: 6,
  Elastic: 7,
  Exponential: 8,
  Circular: 9,
  Cubic: 10,
} as const
export const EASING_DIRECTION = { In: 0, Out: 1, InOut: 2 } as const
// Flex on a UIListLayout (docs/reference/flex-layouts.rbxmx). How a
// list shares out the room left over along a line: not at all (None), by
// growing its children (Fill), or as space around or between them.
export const UI_FLEX_ALIGNMENT = {
  None: 0,
  Fill: 1,
  SpaceAround: 2,
  SpaceBetween: 3,
  SpaceEvenly: 4,
} as const
// Where a child sits across its line: Automatic follows the list's
// alignment (or stretches, when the list flexes that way).
export const ITEM_LINE_ALIGNMENT = {
  Automatic: 0,
  Start: 1,
  Center: 2,
  End: 3,
  Stretch: 4,
} as const
// How a UIFlexItem's element grows into spare room and shrinks when there's
// too little: neither (None: the list decides), grow only, shrink only,
// both (Fill), or by GrowRatio and ShrinkRatio (Custom).
export const UI_FLEX_MODE = {
  None: 0,
  Grow: 1,
  Shrink: 2,
  Fill: 3,
  Custom: 4,
} as const
// Upright or slanted text (Roblox's FontStyle).
export const FONT_STYLE = { Normal: 0, Italic: 1 } as const
// UIStroke on a text element: outline the text (Contextual) or the box.
export const APPLY_STROKE_MODE = { Contextual: 0, Border: 1 } as const
// AutomaticSize: which way an element grows to fit its contents, if any
// (numbered as Studio saves them: docs/reference/sizing.rbxmx).
export const AUTOMATIC_SIZE = { None: 0, X: 1, Y: 2, XY: 3 } as const
// Which way a ScrollingFrame scrolls. Note Roblox's numbering: XY is 4,
// not 3 (docs/reference/scrolling.rbxmx).
export const SCROLLING_DIRECTION = { X: 1, Y: 2, XY: 4 } as const

export type FillDirection = keyof typeof FILL_DIRECTION
export type HorizontalAlignment = keyof typeof HORIZONTAL_ALIGNMENT
export type VerticalAlignment = keyof typeof VERTICAL_ALIGNMENT
export type SortOrder = keyof typeof SORT_ORDER
export type ApplyStrokeMode = keyof typeof APPLY_STROKE_MODE
export type FontWeight = keyof typeof FONT_WEIGHT
export type FontStyle = keyof typeof FONT_STYLE
export type TextXAlignment = keyof typeof TEXT_X_ALIGNMENT
export type TextYAlignment = keyof typeof TEXT_Y_ALIGNMENT
export type TextTruncate = keyof typeof TEXT_TRUNCATE
export type ScaleType = keyof typeof SCALE_TYPE
export type AutomaticSize = keyof typeof AUTOMATIC_SIZE
export type ScrollingDirection = keyof typeof SCROLLING_DIRECTION
export type EasingStyle = keyof typeof EASING_STYLE
export type EasingDirection = keyof typeof EASING_DIRECTION
export type UIFlexAlignment = keyof typeof UI_FLEX_ALIGNMENT
export type ItemLineAlignment = keyof typeof ITEM_LINE_ALIGNMENT
export type UIFlexMode = keyof typeof UI_FLEX_MODE

// The names of an enum, for dropdowns and file checks.
export function enumNames<T extends Record<string, number>>(table: T) {
  return Object.keys(table) as (keyof T & string)[]
}
