// The shape of an Udimo document. Plain TypeScript, no React:
// the canvas, the exporters and (later) the AI all read and write these types.

// ---------- Roblox value types ----------

// UDim2: a size or position on each axis, made of
// Scale (fraction of the parent, 0 to 1) + Offset (pixels).
// Short keys match the .rbxmx format: <XS>, <XO>, <YS>, <YO>.
export type UDim2 = {
  xs: number // X scale
  xo: number // X offset in pixels
  ys: number // Y scale
  yo: number // Y offset in pixels
}

// Vector2: two numbers. Used for AnchorPoint, where (0, 0) is the
// top-left corner of the element and (1, 1) the bottom-right.
export type Vector2 = {
  x: number
  y: number
}

// Color3: red, green and blue, each from 0 to 1 (not 0 to 255),
// because that is how Roblox stores colors in .rbxmx files.
export type Color3 = {
  r: number
  g: number
  b: number
}

// UDim: one axis of a UDim2, Scale + Offset. Used for UICorner's radius.
export type UDim = {
  s: number // scale
  o: number // offset in pixels
}

// Sequences: values that change from time 0 to time 1 (say, across a
// gradient). Roblox calls them ColorSequence and NumberSequence. The first
// keypoint is always at time 0 and the last at time 1.
export type ColorKeypoint = { time: number; color: Color3 }
export type NumberKeypoint = { time: number; value: number }

// ---------- Instances ----------

// The Roblox classes Udimo can create in Phase 1.
export type ClassName =
  | 'ScreenGui'
  | 'Frame'
  | 'TextLabel'
  | 'TextButton'
  | 'TextBox'
  | 'ImageLabel'
  | 'ImageButton'
  | 'ScrollingFrame'

// Property names are spelled exactly like Roblox's, so the exporter can
// write them straight through. All optional: a missing property means
// "use Roblox's default". Transparency goes from 0 (solid) to 1 (invisible).
export type Props = {
  Size?: UDim2
  Position?: UDim2
  AnchorPoint?: Vector2
  BackgroundColor3?: Color3
  BackgroundTransparency?: number
  Visible?: boolean
  ZIndex?: number
  LayoutOrder?: number
  // Text classes (TextLabel, TextButton, TextBox)
  Text?: string
  TextColor3?: Color3
  TextSize?: number
  TextScaled?: boolean
  // TextButton: darkens the button while hovered or pressed, in game
  AutoButtonColor?: boolean
  // TextBox: grey hint text shown while the box is empty, and whether
  // clicking the box empties it
  PlaceholderText?: string
  PlaceholderColor3?: Color3
  ClearTextOnFocus?: boolean
  // Image classes (ImageLabel, ImageButton), e.g. "rbxassetid://123"
  Image?: string
  // ScrollingFrame: the size of the scrollable area its children sit on
  // (Scale is a fraction of the frame), and the scroll bar width in pixels
  CanvasSize?: UDim2
  ScrollBarThickness?: number
}

// Modifiers: objects that sit inside an element in Roblox and change how it
// looks (rounded corners, an outline...). Udimo keeps them on the element
// itself, at most one of each, and the exporter writes them out as child
// instances. Property names are spelled like Roblox's; all optional.
export type ModifierProps = {
  UICorner: {
    // Every corner's radius. Scale is a fraction of the shorter side.
    CornerRadius?: UDim
  }
  UIStroke: {
    // An outline around the element, or around the text of a text element.
    Color?: Color3
    Thickness?: number // pixels
    Transparency?: number
  }
  UIGradient: {
    // Multiplies the element's colors and transparency, changing across it.
    Color?: ColorKeypoint[]
    Transparency?: NumberKeypoint[]
    Rotation?: number // degrees, clockwise; 0 runs left to right
  }
  UIPadding: {
    // Space between the element's edges and its children (and its text).
    // Scale is a fraction of the element's width (left/right) or height.
    PaddingTop?: UDim
    PaddingBottom?: UDim
    PaddingLeft?: UDim
    PaddingRight?: UDim
  }
  UIAspectRatioConstraint: {
    // Width divided by height. The element becomes the biggest box with this
    // shape that fits inside its Size.
    AspectRatio?: number
  }
}
export type ModifierClass = keyof ModifierProps
// An element's modifiers: a modifier is on when its key is present.
export type Modifiers = { [K in ModifierClass]?: ModifierProps[K] }

export type NodeId = string

// One element in the document, e.g. a Frame called "Window".
// Named UiNode (not Node) because browsers already define a type called Node.
export type UiNode = {
  id: NodeId
  className: ClassName
  name: string
  parentId: NodeId | null // null only for the root ScreenGui
  children: NodeId[] // ids of child nodes, in order
  props: Props
  modifiers?: Modifiers
  // Editor-only: a locked element can't be clicked or dragged on the canvas.
  // Roblox GUI objects have no such property, so it's never exported.
  locked?: boolean
}

// The whole document: every node in one lookup table keyed by id,
// plus which node is the root. The tree is rebuilt by following
// `children` from the root.
export type UiDocument = {
  rootId: NodeId
  nodes: Record<NodeId, UiNode>
}
