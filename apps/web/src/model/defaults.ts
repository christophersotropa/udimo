import type { ClassName, Props, UiNode } from './types.ts'

// The values an element gets when you insert it in Roblox Studio, for the
// properties Udimo supports. Checked against a real Studio export:
// docs/reference/defaults.rbxmx (and a test keeps them in sync with it).
// The canvas and the exporter both fill unset properties from here, so the
// editor and Studio always agree.
// Studio's placeholder picture (a white square with a grey picture icon),
// which new image elements start with.
export const PLACEHOLDER_IMAGE =
  'rbxasset://textures/ui/GuiImagePlaceholder.png'

const BASE_DEFAULTS: Required<Props> = {
  Size: { xs: 0, xo: 100, ys: 0, yo: 100 },
  Position: { xs: 0, xo: 0, ys: 0, yo: 0 },
  AnchorPoint: { x: 0, y: 0 },
  BackgroundColor3: { r: 1, g: 1, b: 1 }, // white
  BackgroundTransparency: 0,
  Visible: true,
  ZIndex: 1,
  LayoutOrder: 0,
  Rotation: 0,
  ClipsDescendants: false,
  BorderSizePixel: 0,
  BorderColor3: { r: 0, g: 0, b: 0 }, // black
  Text: 'Label',
  FontFace: { family: 'SourceSansPro', weight: 'Regular' },
  TextColor3: { r: 0, g: 0, b: 0 }, // black
  TextSize: 14,
  TextScaled: false,
  TextWrapped: false,
  TextXAlignment: 'Center',
  TextYAlignment: 'Center',
  TextTransparency: 0,
  RichText: false,
  TextTruncate: 'None',
  LineHeight: 1,
  AutoButtonColor: true,
  PlaceholderText: '',
  PlaceholderColor3: { r: 0.5, g: 0.5, b: 0.5 }, // mid grey
  ClearTextOnFocus: true,
  Image: PLACEHOLDER_IMAGE,
  ImageColor3: { r: 1, g: 1, b: 1 }, // white: the image as it is
  ImageTransparency: 0,
  ScaleType: 'Stretch',
  TileSize: { xs: 1, xo: 0, ys: 1, yo: 0 }, // one tile the element's size
  SliceCenter: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  SliceScale: 1,
  AutomaticSize: 'None',
  CanvasSize: { xs: 0, xo: 0, ys: 2, yo: 0 }, // twice the frame's height
  ScrollBarThickness: 12,
}

// Where a class differs from the base. Every class is checked against a
// Studio reference file in docs/reference/: defaults.rbxmx (Frame,
// TextLabel), text-classes.rbxmx (TextButton, TextBox) and
// image-classes.rbxmx (ImageLabel, ImageButton, ScrollingFrame, which all
// match the base).
const TEXT_SIZE = { xs: 0, xo: 200, ys: 0, yo: 50 }
const CLASS_DEFAULTS: Partial<Record<ClassName, Props>> = {
  TextLabel: { Size: TEXT_SIZE },
  TextButton: { Size: TEXT_SIZE, Text: 'Button' },
  TextBox: { Size: TEXT_SIZE, Text: 'TextBox' },
  // A ScrollingFrame clips its contents by default.
  ScrollingFrame: { ClipsDescendants: true },
}

// Every supported property's default for one class.
export function defaultProps(className: ClassName): Required<Props> {
  return { ...BASE_DEFAULTS, ...CLASS_DEFAULTS[className] }
}

// A node's props with every gap filled in from its class's defaults.
export function resolveProps(node: UiNode): Required<Props> {
  return { ...defaultProps(node.className), ...node.props }
}
