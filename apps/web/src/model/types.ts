import type {
  ApplyStrokeMode,
  AutomaticSize,
  EasingDirection,
  EasingStyle,
  ScrollingDirection,
  FillDirection,
  HorizontalAlignment,
  ScaleType,
  SortOrder,
  TextTruncate,
  TextXAlignment,
  TextYAlignment,
  VerticalAlignment,
} from './enums.ts'
import type { FontFace } from './fonts.ts'

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

// A rectangle by its corners (Roblox's Rect): top-left (min) and
// bottom-right (max), in pixels.
export type Rect = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

// Color3: red, green and blue, each from 0 to 1 (not 0 to 255),
// because that is how Roblox stores colors in .rbxmx files.
export type Color3 = {
  r: number
  g: number
  b: number
}

// A largest size in pixels, per axis, where null means no limit. Roblox
// writes "no limit" as infinity (INF), but a project file is JSON, which
// has no way to write infinity, so Udimo keeps null and the exporters turn
// it into INF / math.huge. (UISizeConstraint's MaxSize.)
export type SizeLimit = {
  x: number | null
  y: number | null
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
  // A Frame whose contents are drawn as one picture, then faded and
  // tinted together (GroupTransparency, GroupColor3).
  | 'CanvasGroup'

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
  // Turns the element around its center, in degrees, clockwise.
  Rotation?: number
  // Cuts off children where they stick out past this element's edges.
  ClipsDescendants?: boolean
  // Roblox's built-in border: how thick (0 = none) and what colour. It's
  // drawn outside the edges (BorderMode Outline). Most UIs use UIStroke.
  BorderSizePixel?: number
  BorderColor3?: Color3
  // Text classes (TextLabel, TextButton, TextBox)
  Text?: string
  // Which font, how thick, and italic or not (see model/fonts.ts)
  FontFace?: FontFace
  TextColor3?: Color3
  TextSize?: number
  // Text grows or shrinks to fill the box (TextSize is then ignored)
  TextScaled?: boolean
  // Long lines wrap onto the next line instead of running past the box
  TextWrapped?: boolean
  // Where the text sits in its box
  TextXAlignment?: TextXAlignment
  TextYAlignment?: TextYAlignment
  // 0 = solid text, 1 = invisible
  TextTransparency?: number
  // Tags in the text like <b>bold</b> style it (see lib/richText.ts)
  RichText?: boolean
  // Text that doesn't fit is cut off with "…"
  TextTruncate?: TextTruncate
  // Space between lines, as a multiple of the normal spacing (1 to 3)
  LineHeight?: number
  // TextButton: darkens the button while hovered or pressed, in game
  AutoButtonColor?: boolean
  // TextBox: grey hint text shown while the box is empty, and whether
  // clicking the box empties it
  PlaceholderText?: string
  PlaceholderColor3?: Color3
  ClearTextOnFocus?: boolean
  // Image classes (ImageLabel, ImageButton), e.g. "rbxassetid://123"
  Image?: string
  // Multiplies the image's colours (white leaves it as it is)
  ImageColor3?: Color3
  // 0 = solid image, 1 = invisible
  ImageTransparency?: number
  // How the image fills the element (see SCALE_TYPE)
  ScaleType?: ScaleType
  // Tile: how big each copy of the image is
  TileSize?: UDim2
  // Slice: the stretchy middle of the image, in the image's own pixels;
  // everything around it (corners and edges) keeps its size
  SliceCenter?: Rect
  // Slice: how big the corners and edges are drawn (2 = twice the size)
  SliceScale?: number
  // Grows the element to fit its contents (its text, its children) across
  // (X), down (Y) or both; Size is then the smallest it gets (layout.ts).
  AutomaticSize?: AutomaticSize
  // ScrollingFrame: the size of the scrollable area its children sit on
  // (Scale is a fraction of the frame), and the scroll bar width in pixels
  CanvasSize?: UDim2
  ScrollBarThickness?: number
  // ScrollingFrame: the canvas grows to fit the children across (X), down
  // (Y) or both, with CanvasSize as its smallest; which way it scrolls; and
  // the scroll bar's colour and see-through-ness.
  AutomaticCanvasSize?: AutomaticSize
  ScrollingDirection?: ScrollingDirection
  ScrollBarImageColor3?: Color3
  ScrollBarImageTransparency?: number
  // CanvasGroup: fades (0 = solid, 1 = invisible) and tints (multiplies by
  // this colour; white leaves it as it is) the whole group as one picture,
  // so overlapping children don't show through each other.
  GroupTransparency?: number
  GroupColor3?: Color3
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
    // On a text element: outline the text (Contextual) or the box (Border).
    // Other elements always get a box outline.
    ApplyStrokeMode?: ApplyStrokeMode
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
  UIScale: {
    // Draws the element and everything inside it this many times bigger
    // (1.5 = half as big again), around its AnchorPoint.
    Scale?: number
  }
  UISizeConstraint: {
    // The element's smallest and largest size in pixels, whatever its Size
    // says (null in MaxSize: no limit that way).
    MinSize?: Vector2
    MaxSize?: SizeLimit
  }
  UITextSizeConstraint: {
    // With TextScaled: the smallest and largest text size it may pick.
    MinTextSize?: number
    MaxTextSize?: number
  }
  // Layouts place the element's children for you, ignoring their Position.
  // An element has at most one layout.
  UIListLayout: {
    // Children one after another, in a column (Vertical) or a row.
    FillDirection?: FillDirection
    HorizontalAlignment?: HorizontalAlignment
    VerticalAlignment?: VerticalAlignment
    SortOrder?: SortOrder
    Padding?: UDim // the gap between children
  }
  UIGridLayout: {
    // Children in a grid of equal cells, filling rows (Horizontal) or
    // columns first. Each child takes the cell's size.
    CellSize?: UDim2
    CellPadding?: UDim2 // the gaps between cells
    FillDirection?: FillDirection
    // Most cells per row (or column); 0 means as many as fit.
    FillDirectionMaxCells?: number
    HorizontalAlignment?: HorizontalAlignment
    VerticalAlignment?: VerticalAlignment
    SortOrder?: SortOrder
  }
  UIPageLayout: {
    // The children become pages, one after another in a row (Horizontal)
    // or a column; each keeps its own size. The page being shown is
    // aligned inside the element and the others continue either side of
    // it, Padding apart. A game flips pages with the scroll wheel, a swipe
    // or a gamepad (each can be turned off), or from a script.
    FillDirection?: FillDirection
    HorizontalAlignment?: HorizontalAlignment
    VerticalAlignment?: VerticalAlignment
    SortOrder?: SortOrder
    Padding?: UDim // the gap between pages
    // Slide to the new page (else jump), taking TweenTime seconds, with
    // this easing.
    Animated?: boolean
    TweenTime?: number
    EasingStyle?: EasingStyle
    EasingDirection?: EasingDirection
    // Going past the last page comes back to the first (and back again).
    Circular?: boolean
    ScrollWheelInputEnabled?: boolean
    TouchInputEnabled?: boolean
    GamepadInputEnabled?: boolean
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
  // Editor-only: a picture from your computer that an image element shows
  // on the canvas, as a key into UiDocument.images. Never exported: in
  // Roblox the Image property (an uploaded asset ID) is what counts.
  previewImage?: string
  // Editor-only, on an element with a UIPageLayout: the page (one of its
  // children) the canvas shows; missing or not a page means the first.
  // In game a page layout always starts on its first page, so this is
  // never exported, and isn't kept in project files either.
  shownPage?: NodeId
}

// A picture picked from your computer to preview an image element. Kept
// in the project as a data URL (the image's bytes written out as text, so
// it needs no server), shrunk to at most 1024 px, Roblox's own limit.
export type PreviewImage = {
  name: string // the file's name, to remind you what to upload
  dataUrl: string // "data:image/png;base64,..."
  width: number
  height: number
}

// The whole document: every node in one lookup table keyed by id,
// plus which node is the root. The tree is rebuilt by following
// `children` from the root.
export type UiDocument = {
  rootId: NodeId
  nodes: Record<NodeId, UiNode>
  // Editor-only: preview pictures, by key (UiNode.previewImage). One
  // picture used by six elements is stored once.
  images?: Record<string, PreviewImage>
}
