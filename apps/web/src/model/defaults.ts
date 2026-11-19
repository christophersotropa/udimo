import type { ClassName, Props, UiNode } from './types.ts'

// The values an element gets when you insert it in Roblox Studio, for the
// properties Udimo supports. Checked against a real Studio export:
// docs/reference/defaults.rbxmx (and a test keeps them in sync with it).
// The canvas and the exporter both fill unset properties from here, so the
// editor and Studio always agree.
const BASE_DEFAULTS: Required<Props> = {
  Size: { xs: 0, xo: 100, ys: 0, yo: 100 },
  Position: { xs: 0, xo: 0, ys: 0, yo: 0 },
  AnchorPoint: { x: 0, y: 0 },
  BackgroundColor3: { r: 1, g: 1, b: 1 }, // white
  BackgroundTransparency: 0,
  Visible: true,
  ZIndex: 1,
  LayoutOrder: 0,
  Text: 'Label',
  TextColor3: { r: 0, g: 0, b: 0 }, // black
  TextSize: 14,
  TextScaled: false,
  AutoButtonColor: true,
  PlaceholderText: '',
  PlaceholderColor3: { r: 0.5, g: 0.5, b: 0.5 }, // mid grey
  ClearTextOnFocus: true,
  Image: '',
}

// Where a class differs from the base. Checked against the Studio reference
// files so far: Frame and TextLabel (defaults.rbxmx), TextButton and TextBox
// (text-classes.rbxmx). Image classes and ScrollingFrame come in build 23.
const TEXT_SIZE = { xs: 0, xo: 200, ys: 0, yo: 50 }
const CLASS_DEFAULTS: Partial<Record<ClassName, Props>> = {
  TextLabel: { Size: TEXT_SIZE },
  TextButton: { Size: TEXT_SIZE, Text: 'Button' },
  TextBox: { Size: TEXT_SIZE, Text: 'TextBox' },
}

// Every supported property's default for one class.
export function defaultProps(className: ClassName): Required<Props> {
  return { ...BASE_DEFAULTS, ...CLASS_DEFAULTS[className] }
}

// A node's props with every gap filled in from its class's defaults.
export function resolveProps(node: UiNode): Required<Props> {
  return { ...defaultProps(node.className), ...node.props }
}
