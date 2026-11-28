import type { ModifierClass, ModifierProps, UiNode } from './types.ts'

// Modifier defaults and helpers. Plain TypeScript, no React.
// (Pixel maths that uses modifiers, like corner radius, is in layout.ts.)

const WHITE = { r: 1, g: 1, b: 1 }
const NO_SPACE = { s: 0, o: 0 }

// What a modifier starts with when you insert it in Studio, checked against
// the files in docs/reference/ (corner-stroke, gradient-padding-aspect,
// list-grid-layouts, sizing, ui-page-layout and flex-layouts).
export const MODIFIER_DEFAULTS: {
  [K in ModifierClass]: Required<ModifierProps[K]>
} = {
  UICorner: { CornerRadius: { s: 0, o: 8 } },
  UIStroke: {
    Color: { r: 0, g: 0, b: 0 },
    Thickness: 1,
    Transparency: 0,
    ApplyStrokeMode: 'Contextual',
  },
  UIGradient: {
    Color: [
      { time: 0, color: WHITE },
      { time: 1, color: WHITE },
    ],
    Transparency: [
      { time: 0, value: 0 },
      { time: 1, value: 0 },
    ],
    Rotation: 0,
  },
  UIPadding: {
    PaddingTop: NO_SPACE,
    PaddingBottom: NO_SPACE,
    PaddingLeft: NO_SPACE,
    PaddingRight: NO_SPACE,
  },
  UIAspectRatioConstraint: { AspectRatio: 1 },
  UIScale: { Scale: 1 },
  UISizeConstraint: {
    MinSize: { x: 0, y: 0 },
    MaxSize: { x: null, y: null }, // no limit (INF in Studio's file)
  },
  UITextSizeConstraint: { MinTextSize: 1, MaxTextSize: 100 },
  UIListLayout: {
    FillDirection: 'Vertical',
    HorizontalAlignment: 'Left',
    VerticalAlignment: 'Top',
    SortOrder: 'LayoutOrder',
    Padding: NO_SPACE,
    HorizontalFlex: 'None',
    VerticalFlex: 'None',
    Wraps: false,
    ItemLineAlignment: 'Automatic',
  },
  UIGridLayout: {
    CellSize: { xs: 0, xo: 100, ys: 0, yo: 100 },
    CellPadding: { xs: 0, xo: 5, ys: 0, yo: 5 },
    FillDirection: 'Horizontal',
    FillDirectionMaxCells: 0,
    HorizontalAlignment: 'Left',
    VerticalAlignment: 'Top',
    SortOrder: 'LayoutOrder',
  },
  UIPageLayout: {
    FillDirection: 'Horizontal',
    HorizontalAlignment: 'Left', // Studio's default, from the reference file
    VerticalAlignment: 'Top',
    SortOrder: 'LayoutOrder',
    Padding: NO_SPACE,
    Animated: true,
    TweenTime: 1,
    EasingStyle: 'Back',
    EasingDirection: 'Out',
    Circular: false,
    ScrollWheelInputEnabled: true,
    TouchInputEnabled: true,
    GamepadInputEnabled: true,
  },
  UIFlexItem: {
    FlexMode: 'None',
    GrowRatio: 0,
    ShrinkRatio: 0,
    ItemLineAlignment: 'Automatic',
  },
}

// The layout modifiers. An element can only have one: adding one removes
// the others, because Roblox would only use one of them anyway.
export const LAYOUT_MODIFIERS: ModifierClass[] = [
  'UIListLayout',
  'UIGridLayout',
  'UIPageLayout',
]

// True if the element has a layout modifier (which places its children).
export function hasLayout(node: UiNode): boolean {
  return LAYOUT_MODIFIERS.some((layout) => node.modifiers?.[layout])
}

// Every modifier class, in the order they're shown and exported.
export const MODIFIER_CLASSES = Object.keys(
  MODIFIER_DEFAULTS,
) as ModifierClass[]

// A modifier's props with the gaps filled from its defaults, or null if the
// element doesn't have that modifier.
export function resolveModifier<K extends ModifierClass>(
  node: UiNode,
  modifier: K,
): Required<ModifierProps[K]> | null {
  const props = node.modifiers?.[modifier]
  return props ? { ...MODIFIER_DEFAULTS[modifier], ...props } : null
}

// A UDim as "14 px", "50%" or "50% + 4 px".
function udimText({ s, o }: { s: number; o: number }): string {
  const parts = [
    s !== 0 && `${Math.round(s * 1000) / 10}%`,
    (o !== 0 || s === 0) && `${o} px`,
  ].filter(Boolean)
  return parts.join(' + ')
}

// How each modifier describes itself. Typed so every modifier must have an
// entry, like the exporter's tables.
const SUMMARIES: {
  [K in ModifierClass]: (props: Required<ModifierProps[K]>) => string
} = {
  UICorner: ({ CornerRadius }) => udimText(CornerRadius),
  UIStroke: ({ Thickness }) => `${Thickness} px`,
  UIGradient: ({ Rotation }) =>
    Rotation === 0 ? 'left to right' : `${Rotation}°`,
  UIPadding: (p) => {
    const sides = [
      p.PaddingTop,
      p.PaddingRight,
      p.PaddingBottom,
      p.PaddingLeft,
    ].map(udimText)
    return sides.every((side) => side === sides[0])
      ? sides[0]
      : sides.join(' / ')
  },
  UIAspectRatioConstraint: ({ AspectRatio }) => `ratio ${AspectRatio}`,
  UIScale: ({ Scale }) => `× ${Scale}`,
  UISizeConstraint: ({ MinSize, MaxSize }) => {
    const most = (n: number | null) => (n === null ? '∞' : `${n}`)
    return `${MinSize.x}×${MinSize.y} to ${most(MaxSize.x)}×${most(MaxSize.y)} px`
  },
  UITextSizeConstraint: ({ MinTextSize, MaxTextSize }) =>
    `text ${MinTextSize}–${MaxTextSize}`,
  UIListLayout: ({ FillDirection, Padding, Wraps }) =>
    `${FillDirection}, ${udimText(Padding)} gap${Wraps ? ', wraps' : ''}`,
  UIGridLayout: ({ CellSize }) => {
    const size = (s: number, o: number) =>
      s === 0 ? `${o}` : udimText({ s, o })
    return `${size(CellSize.xs, CellSize.xo)} × ${size(CellSize.ys, CellSize.yo)} cells`
  },
  UIPageLayout: ({ FillDirection, Animated, TweenTime }) =>
    `${FillDirection} pages${Animated ? `, ${TweenTime} s` : ''}`,
  UIFlexItem: ({ FlexMode, GrowRatio, ShrinkRatio }) =>
    FlexMode === 'Custom'
      ? `grow ${GrowRatio}, shrink ${ShrinkRatio}`
      : FlexMode === 'None'
        ? 'as the list says'
        : FlexMode,
}

// A short description of a modifier's settings, for its card in the
// Properties panel: "UICorner · 14 px", "UIListLayout · Vertical, 8 px gap".
// `props` are the modifier's props with the defaults filled in.
export function modifierSummary<K extends ModifierClass>(
  modifier: K,
  props: Required<ModifierProps[K]>,
): string {
  // TypeScript can't link SUMMARIES[modifier] to K by itself, so the lookup
  // is widened by hand (the table's type already guarantees it matches).
  const describe = SUMMARIES[modifier] as (p: typeof props) => string
  return describe(props)
}
