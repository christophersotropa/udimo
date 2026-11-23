import { toContentUri } from '../lib/assets.ts'
import { isImageClass, isTextClass } from '../model/classes.ts'
import { resolveProps } from '../model/defaults.ts'
import {
  APPLY_STROKE_MODE,
  AUTOMATIC_SIZE,
  BORDER_MODE,
  FILL_DIRECTION,
  type FontStyle,
  type FontWeight,
  HORIZONTAL_ALIGNMENT,
  SCALE_TYPE,
  SORT_ORDER,
  TEXT_TRUNCATE,
  TEXT_X_ALIGNMENT,
  TEXT_Y_ALIGNMENT,
  VERTICAL_ALIGNMENT,
  Z_INDEX_BEHAVIOR,
} from '../model/enums.ts'
import { FONTS, resolveFontFace } from '../model/fonts.ts'
import { MODIFIER_CLASSES, resolveModifier } from '../model/modifiers.ts'
import { BUTTON_SCRIPT_NAME, buttonScriptSource } from './scripts.ts'
import type {
  Color3,
  ColorKeypoint,
  ModifierClass,
  ModifierProps,
  NodeId,
  NumberKeypoint,
  Props,
  Rect,
  UDim,
  UDim2,
  UiDocument,
  Vector2,
} from '../model/types.ts'

// What gets exported: the document as the Roblox instances it becomes, each
// with a list of typed property values. Both exporters start from this, so
// they can never disagree about which properties an instance has:
//   rbxmx.ts writes it as an XML file, luau.ts as a script.
//
// Like Studio, every supported property is listed in full, defaults filled
// in, so the result never depends on what Roblox assumes for a missing one.
// (That matters most for the script: Instance.new() starts from different
// defaults than Studio's Insert menu, like a grey background.)

// One property value, tagged with its Roblox type. Offsets and whole-number
// properties are rounded here, because Roblox stores them as integers.
export type Value =
  | { type: 'string'; value: string }
  | { type: 'bool'; value: boolean }
  | { type: 'int'; value: number }
  | { type: 'float'; value: number }
  // An enum: its name (FillDirection), the option (Vertical) and the number
  // files store for it (1).
  | { type: 'enum'; enumName: string; item: string; token: number }
  | { type: 'UDim'; value: UDim }
  | { type: 'UDim2'; value: UDim2 }
  | { type: 'Vector2'; value: Vector2 }
  | { type: 'Rect'; value: Rect }
  | { type: 'Color3'; value: Color3 }
  | { type: 'Content'; value: string } // an image URI, '' for none
  | {
      type: 'Font'
      family: string
      weight: FontWeight
      style: FontStyle
      // The font file Studio caches for its default font (null otherwise).
      cachedFaceId: string | null
    }
  | { type: 'ColorSequence'; value: ColorKeypoint[] }
  | { type: 'NumberSequence'; value: NumberKeypoint[] }
  // A script's code.
  | { type: 'source'; value: string }

// `only`: a few properties are written differently by each format, so each
// version says which exporter it's for. Unmarked properties go in both.
export type Property = { name: string; value: Value; only?: 'rbxmx' | 'luau' }

export type ExportInstance = {
  className: string
  properties: Property[]
  children: ExportInstance[] // modifiers first, then child elements
}

// ---------- Property helpers ----------

const prop = (name: string, value: Value, only?: Property['only']): Property =>
  only ? { name, value, only } : { name, value }
const string = (name: string, value: string) =>
  prop(name, { type: 'string', value })
const bool = (name: string, value: boolean) =>
  prop(name, { type: 'bool', value })
const int = (name: string, value: number) =>
  prop(name, { type: 'int', value: Math.round(value) })
const float = (name: string, value: number) =>
  prop(name, { type: 'float', value })
const udim = (name: string, v: UDim, only?: Property['only']) =>
  prop(name, { type: 'UDim', value: { s: v.s, o: Math.round(v.o) } }, only)
const udim2 = (name: string, v: UDim2) =>
  prop(name, {
    type: 'UDim2',
    value: { xs: v.xs, xo: Math.round(v.xo), ys: v.ys, yo: Math.round(v.yo) },
  })
const vector2 = (name: string, value: Vector2) =>
  prop(name, { type: 'Vector2', value })
const color3 = (name: string, value: Color3) =>
  prop(name, { type: 'Color3', value })
// An enum property whose enum has the same name as the property, like
// FillDirection: Enum.FillDirection.
function enumProp<T extends Record<string, number>>(
  name: string,
  table: T,
  item: keyof T & string,
): Property {
  return prop(name, { type: 'enum', enumName: name, item, token: table[item] })
}

// A FontFace. For its default font (Source Sans Pro, regular) Studio also
// saves a CachedFaceId, the actual font file. It's only a cache Roblox fills
// in itself, and Studio leaves it out for other fonts (see
// docs/reference/fonts.rbxmx), so only the default gets one.
// The weight written is the one the font really draws (see closestWeight),
// as Studio would only ever save one it offers.
function fontFace(chosen: Required<Props>['FontFace']): Property {
  const face = resolveFontFace(chosen)
  const isDefault =
    face.family === 'SourceSansPro' &&
    face.weight === 'Regular' &&
    face.style === 'Normal'
  return prop('FontFace', {
    type: 'Font',
    family: FONTS[face.family].family,
    weight: face.weight,
    style: face.style,
    cachedFaceId: isDefault
      ? 'rbxasset://fonts/SourceSansPro-Regular.ttf'
      : null,
  })
}

// ---------- Elements ----------

function elementProperties(doc: UiDocument, id: NodeId): Property[] {
  const node = doc.nodes[id]
  const properties = [string('Name', node.name)]

  if (node.className === 'ScreenGui') {
    // Sibling: children draw above their parent, like the canvas draws them.
    properties.push(enumProp('ZIndexBehavior', Z_INDEX_BEHAVIOR, 'Sibling'))
    return properties
  }

  const p = resolveProps(node)
  properties.push(
    vector2('AnchorPoint', p.AnchorPoint),
    color3('BackgroundColor3', p.BackgroundColor3),
    float('BackgroundTransparency', p.BackgroundTransparency),
    color3('BorderColor3', p.BorderColor3),
    enumProp('BorderMode', BORDER_MODE, 'Outline'),
    int('BorderSizePixel', p.BorderSizePixel),
    bool('ClipsDescendants', p.ClipsDescendants),
    int('LayoutOrder', p.LayoutOrder),
    udim2('Position', p.Position),
    float('Rotation', p.Rotation),
    udim2('Size', p.Size),
    bool('Visible', p.Visible),
    int('ZIndex', p.ZIndex),
    enumProp('AutomaticSize', AUTOMATIC_SIZE, p.AutomaticSize),
  )

  if (isTextClass(node.className)) {
    properties.push(
      fontFace(p.FontFace),
      string('Text', p.Text),
      float('LineHeight', p.LineHeight),
      bool('RichText', p.RichText),
      color3('TextColor3', p.TextColor3),
      bool('TextScaled', p.TextScaled),
      float('TextSize', p.TextSize),
      float('TextTransparency', p.TextTransparency),
      enumProp('TextTruncate', TEXT_TRUNCATE, p.TextTruncate),
      bool('TextWrapped', p.TextWrapped),
      enumProp('TextXAlignment', TEXT_X_ALIGNMENT, p.TextXAlignment),
      enumProp('TextYAlignment', TEXT_Y_ALIGNMENT, p.TextYAlignment),
    )
  }

  if (node.className === 'TextButton' || node.className === 'ImageButton') {
    properties.push(bool('AutoButtonColor', p.AutoButtonColor))
  }

  if (node.className === 'TextBox') {
    properties.push(
      bool('ClearTextOnFocus', p.ClearTextOnFocus),
      color3('PlaceholderColor3', p.PlaceholderColor3),
      string('PlaceholderText', p.PlaceholderText),
    )
  }

  if (isImageClass(node.className)) {
    // A pasted id or link becomes a proper rbxassetid:// URI. Studio files
    // now store it as ImageContent (see docs/reference/image-classes.rbxmx);
    // a script sets the long-standing Image property.
    const uri = toContentUri(p.Image)
    properties.push(
      prop('ImageContent', { type: 'Content', value: uri }, 'rbxmx'),
      prop('Image', { type: 'string', value: uri }, 'luau'),
      color3('ImageColor3', p.ImageColor3),
      float('ImageTransparency', p.ImageTransparency),
      enumProp('ScaleType', SCALE_TYPE, p.ScaleType),
      prop('SliceCenter', { type: 'Rect', value: p.SliceCenter }),
      float('SliceScale', p.SliceScale),
      udim2('TileSize', p.TileSize),
    )
  }

  if (node.className === 'ScrollingFrame') {
    properties.push(
      udim2('CanvasSize', p.CanvasSize),
      int('ScrollBarThickness', p.ScrollBarThickness),
    )
  }

  return properties
}

// ---------- Modifiers ----------

// Each modifier's properties, from its props with the defaults filled in.
// Typed so every modifier must have an entry here.
const MODIFIER_PROPERTIES: {
  [K in ModifierClass]: (props: Required<ModifierProps[K]>) => Property[]
} = {
  // Studio files now store a radius per corner; a script sets CornerRadius,
  // which sets all four. Udimo has one radius for all four either way.
  UICorner: ({ CornerRadius }) => [
    udim('BottomLeftRadius', CornerRadius, 'rbxmx'),
    udim('BottomRightRadius', CornerRadius, 'rbxmx'),
    udim('TopLeftRadius', CornerRadius, 'rbxmx'),
    udim('TopRightRadius', CornerRadius, 'rbxmx'),
    udim('CornerRadius', CornerRadius, 'luau'),
  ],
  UIStroke: ({ Color, Thickness, Transparency, ApplyStrokeMode }) => [
    enumProp('ApplyStrokeMode', APPLY_STROKE_MODE, ApplyStrokeMode),
    color3('Color', Color),
    float('Thickness', Thickness),
    float('Transparency', Transparency),
  ],
  UIGradient: ({ Color, Transparency, Rotation }) => [
    prop('Color', { type: 'ColorSequence', value: Color }),
    prop('Transparency', { type: 'NumberSequence', value: Transparency }),
    float('Rotation', Rotation),
  ],
  UIPadding: (padding) => [
    udim('PaddingBottom', padding.PaddingBottom),
    udim('PaddingLeft', padding.PaddingLeft),
    udim('PaddingRight', padding.PaddingRight),
    udim('PaddingTop', padding.PaddingTop),
  ],
  UIAspectRatioConstraint: ({ AspectRatio }) => [
    float('AspectRatio', AspectRatio),
  ],
  UIScale: ({ Scale }) => [float('Scale', Scale)],
  // "No limit" (null) is infinity in Roblox; each exporter writes it its
  // own way (INF in a file, math.huge in a script).
  UISizeConstraint: ({ MinSize, MaxSize }) => [
    vector2('MaxSize', {
      x: MaxSize.x ?? Infinity,
      y: MaxSize.y ?? Infinity,
    }),
    vector2('MinSize', MinSize),
  ],
  UITextSizeConstraint: ({ MinTextSize, MaxTextSize }) => [
    int('MaxTextSize', MaxTextSize),
    int('MinTextSize', MinTextSize),
  ],
  UIListLayout: (list) => [
    enumProp('FillDirection', FILL_DIRECTION, list.FillDirection),
    enumProp(
      'HorizontalAlignment',
      HORIZONTAL_ALIGNMENT,
      list.HorizontalAlignment,
    ),
    udim('Padding', list.Padding),
    enumProp('SortOrder', SORT_ORDER, list.SortOrder),
    enumProp('VerticalAlignment', VERTICAL_ALIGNMENT, list.VerticalAlignment),
  ],
  UIGridLayout: (grid) => [
    udim2('CellPadding', grid.CellPadding),
    udim2('CellSize', grid.CellSize),
    enumProp('FillDirection', FILL_DIRECTION, grid.FillDirection),
    int('FillDirectionMaxCells', grid.FillDirectionMaxCells),
    enumProp(
      'HorizontalAlignment',
      HORIZONTAL_ALIGNMENT,
      grid.HorizontalAlignment,
    ),
    enumProp('SortOrder', SORT_ORDER, grid.SortOrder),
    enumProp('VerticalAlignment', VERTICAL_ALIGNMENT, grid.VerticalAlignment),
  ],
}

// An element's modifiers, as the child instances Roblox expects.
function modifierInstances(doc: UiDocument, id: NodeId): ExportInstance[] {
  const node = doc.nodes[id]
  const instances: ExportInstance[] = []
  for (const modifier of MODIFIER_CLASSES) {
    const props = resolveModifier(node, modifier)
    if (!props) continue
    // TypeScript can't follow that `props` belongs to this same `modifier`
    // inside a loop, so the lookup is widened by hand.
    const propertiesFor = MODIFIER_PROPERTIES[modifier] as (
      p: typeof props,
    ) => Property[]
    instances.push({
      className: modifier,
      properties: [string('Name', modifier), ...propertiesFor(props)],
      children: [],
    })
  }
  return instances
}

// ---------- The tree ----------

// The whole document as instances, starting from the ScreenGui.
// `resetOnSpawn` is the ScreenGui's ResetOnSpawn (see export/options.ts).
// `buttonScript` adds the button-stubs LocalScript (see export/scripts.ts).
export function exportTree(
  doc: UiDocument,
  {
    resetOnSpawn = true,
    buttonScript = false,
  }: { resetOnSpawn?: boolean; buttonScript?: boolean } = {},
): ExportInstance {
  function build(id: NodeId): ExportInstance {
    const node = doc.nodes[id]
    const properties = elementProperties(doc, id)
    if (id === doc.rootId) {
      properties.push(bool('ResetOnSpawn', resetOnSpawn))
    }
    return {
      className: node.className,
      properties,
      children: [...modifierInstances(doc, id), ...node.children.map(build)],
    }
  }
  const root = build(doc.rootId)
  const source = buttonScript ? buttonScriptSource(doc) : null
  if (source) {
    root.children.push({
      className: 'LocalScript',
      properties: [
        string('Name', BUTTON_SCRIPT_NAME),
        prop('Source', { type: 'source', value: source }),
      ],
      children: [],
    })
  }
  return root
}

// How many instances a tree holds, counting itself: what Studio's Explorer
// will show once the file is inserted (the ScreenGui, every element, every
// modifier, and the LocalScript if there is one).
export function countInstances(instance: ExportInstance): number {
  return instance.children.reduce(
    (total, child) => total + countInstances(child),
    1,
  )
}
