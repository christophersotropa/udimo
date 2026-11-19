import type { ModifierClass, ModifierProps, UiNode } from './types.ts'

// Modifier defaults and helpers. Plain TypeScript, no React.
// (Pixel maths that uses modifiers, like corner radius, is in layout.ts.)

const WHITE = { r: 1, g: 1, b: 1 }
const NO_SPACE = { s: 0, o: 0 }

// What a modifier starts with when you insert it in Studio, checked against
// docs/reference/corner-stroke.rbxmx and gradient-padding-aspect.rbxmx.
export const MODIFIER_DEFAULTS: {
  [K in ModifierClass]: Required<ModifierProps[K]>
} = {
  UICorner: { CornerRadius: { s: 0, o: 8 } },
  UIStroke: { Color: { r: 0, g: 0, b: 0 }, Thickness: 1, Transparency: 0 },
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
