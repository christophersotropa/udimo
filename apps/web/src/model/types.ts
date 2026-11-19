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
  // Image classes (ImageLabel, ImageButton), e.g. "rbxassetid://123"
  Image?: string
}

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
