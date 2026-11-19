import { absoluteBox } from './layout.ts'
import type { ScreenSize } from './screen.ts'
import type {
  ModifierClass,
  ModifierProps,
  NodeId,
  UiDocument,
  UiNode,
} from './types.ts'

// Modifier defaults and helpers. Plain TypeScript, no React.

// What a modifier starts with when you insert it in Studio, checked against
// docs/reference/corner-stroke.rbxmx.
export const MODIFIER_DEFAULTS: {
  [K in ModifierClass]: Required<ModifierProps[K]>
} = {
  UICorner: { CornerRadius: { s: 0, o: 8 } },
  UIStroke: { Color: { r: 0, g: 0, b: 0 }, Thickness: 1, Transparency: 0 },
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

// An element's corner radius in pixels (0 without a UICorner). Scale is a
// fraction of the element's shorter side, and like Roblox the radius never
// goes past half that side, which makes a perfect pill or circle.
export function cornerRadiusPixels(
  doc: UiDocument,
  id: NodeId,
  screen: ScreenSize,
): number {
  const corner = resolveModifier(doc.nodes[id], 'UICorner')
  if (!corner) return 0
  const box = absoluteBox(doc, id, screen)
  const shorter = Math.max(0, Math.min(box.width, box.height))
  const radius = corner.CornerRadius.s * shorter + corner.CornerRadius.o
  return Math.min(Math.max(0, radius), shorter / 2)
}
