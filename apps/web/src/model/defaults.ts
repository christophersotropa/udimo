import { color3FromRgb } from '../lib/color.ts'
import type { Props, UiNode } from './types.ts'

// Roblox's default values for the properties Udimo supports: what an
// element has when the property was never set. The canvas must use the same
// defaults as Roblox, or a missing property would look different in Studio.
// To be checked against a real Studio export in build 11.
export const ROBLOX_DEFAULTS: Required<Props> = {
  Size: { xs: 0, xo: 0, ys: 0, yo: 0 },
  Position: { xs: 0, xo: 0, ys: 0, yo: 0 },
  AnchorPoint: { x: 0, y: 0 },
  BackgroundColor3: color3FromRgb(163, 162, 165),
  BackgroundTransparency: 0,
  Visible: true,
  ZIndex: 1,
  LayoutOrder: 0,
  Text: 'Label',
  TextColor3: color3FromRgb(27, 42, 53),
  TextSize: 14,
  TextScaled: false,
  Image: '',
}

// A node's props with every gap filled in from Roblox's defaults.
export function resolveProps(node: UiNode): Required<Props> {
  return { ...ROBLOX_DEFAULTS, ...node.props }
}
