import { createId } from '../lib/ids.ts'
import { defaultProps } from '../model/defaults.ts'
import {
  APPLY_STROKE_MODE,
  AUTOMATIC_SIZE,
  SCROLLING_DIRECTION,
  FILL_DIRECTION,
  FONT_STYLE,
  FONT_WEIGHT,
  HORIZONTAL_ALIGNMENT,
  SCALE_TYPE,
  SORT_ORDER,
  TEXT_TRUNCATE,
  TEXT_X_ALIGNMENT,
  TEXT_Y_ALIGNMENT,
  VERTICAL_ALIGNMENT,
} from '../model/enums.ts'
import { FONT_IDS, FONTS, type FontFace } from '../model/fonts.ts'
import {
  LAYOUT_MODIFIERS,
  MODIFIER_CLASSES,
  MODIFIER_DEFAULTS,
} from '../model/modifiers.ts'
import {
  MODIFIER_CHECKS,
  parseProject,
  PROP_CHECKS,
  serializeProject,
} from '../model/project.ts'
import type {
  ClassName,
  ModifierClass,
  ModifierProps,
  Modifiers,
  NodeId,
  Props,
  UiDocument,
  UiNode,
} from '../model/types.ts'
import {
  type RawInstance,
  type RawValue,
  RbxmxError,
  readRbxmx,
} from './readRbxmx.ts'

// Turns an .rbxmx file into an Udimo document: the reverse of
// export/instances.ts. Supported classes become elements, UICorner and the
// other modifiers go onto their element, and everything else is left out
// and listed in a report, so nothing disappears without a word.
// Every value is checked by the same rules as project files
// (model/project.ts), so an imported file can't put the editor in a state a
// project file couldn't.

export { RbxmxError }

// Something left out, for the report: "LocalScript “Handler” in Shop.Window".
export type SkippedInstance = {
  className: string
  name: string
  path: string // where it was, from the ScreenGui down (its parent's path)
  inside: number // how many instances were inside it, left out with it
}

export type ImportResult = {
  document: UiDocument
  // How many instances came in: the ScreenGui, elements and modifiers.
  imported: number
  skipped: SkippedInstance[]
  // Values that didn't fit, one sentence each ("TextLabel Title: font
  // Gotham isn't in Udimo yet; it uses Source Sans Pro").
  notes: string[]
  // True when the file held elements but no ScreenGui (a Frame saved on
  // its own): they were put in a new ScreenGui, and the editor may add
  // them to the current design instead.
  wrapped: boolean
}

const ELEMENT_CLASSES: readonly ClassName[] = [
  'Frame',
  'TextLabel',
  'TextButton',
  'TextBox',
  'ImageLabel',
  'ImageButton',
  'ScrollingFrame',
]
const isElement = (className: string): className is ClassName =>
  (ELEMENT_CLASSES as readonly string[]).includes(className)
const isModifier = (className: string): className is ModifierClass =>
  (MODIFIER_CLASSES as readonly string[]).includes(className)

// ---------- Reading one value ----------

// Turns a raw value into Udimo's form, or undefined when it's the wrong
// type for the property (then the property is left at its default).
type Read = (v: RawValue) => unknown

const asNumber: Read = (v) => (v.type === 'number' ? v.value : undefined)
const asBool: Read = (v) => (v.type === 'bool' ? v.value : undefined)
const asString: Read = (v) => (v.type === 'string' ? v.value : undefined)
const asUDim: Read = (v) => (v.type === 'UDim' ? { s: v.s, o: v.o } : undefined)
const asUDim2: Read = (v) =>
  v.type === 'UDim2' ? { xs: v.xs, xo: v.xo, ys: v.ys, yo: v.yo } : undefined
const asVector2: Read = (v) =>
  v.type === 'Vector2' ? { x: v.x, y: v.y } : undefined
const asRect: Read = (v) =>
  v.type === 'Rect'
    ? { minX: v.minX, minY: v.minY, maxX: v.maxX, maxY: v.maxY }
    : undefined
// A size limit: infinity (Studio's INF) is "no limit", null in Udimo.
const asSizeLimit: Read = (v) =>
  v.type === 'Vector2'
    ? {
        x: v.x === Infinity ? null : v.x,
        y: v.y === Infinity ? null : v.y,
      }
    : undefined
const asColor3: Read = (v) =>
  v.type === 'Color3' ? { r: v.r, g: v.g, b: v.b } : undefined
const asColorSequence: Read = (v) =>
  v.type === 'ColorSequence' ? v.value : undefined
const asNumberSequence: Read = (v) =>
  v.type === 'NumberSequence' ? v.value : undefined
// An image: Content in newer files (ImageContent), a string in older ones.
const asImage: Read = (v) =>
  v.type === 'Content' || v.type === 'string' ? v.value : undefined
// An enum: the stored number back to its name, using the same table the
// exporter writes with.
const asEnum =
  (table: Record<string, number>): Read =>
  (v) =>
    v.type === 'token'
      ? Object.keys(table).find((name) => table[name] === v.value)
      : undefined

// Where each Udimo property comes from: the Roblox properties to look for,
// first found wins, and how to read it. Typed so every property in Props
// needs an entry (FontFace is read separately, as it can need a note).
const PROP_SOURCES: Record<
  Exclude<keyof Props, 'FontFace'>,
  [names: string[], read: Read]
> = {
  Size: [['Size'], asUDim2],
  Position: [['Position'], asUDim2],
  AnchorPoint: [['AnchorPoint'], asVector2],
  BackgroundColor3: [['BackgroundColor3'], asColor3],
  BackgroundTransparency: [['BackgroundTransparency'], asNumber],
  Visible: [['Visible'], asBool],
  ZIndex: [['ZIndex'], asNumber],
  LayoutOrder: [['LayoutOrder'], asNumber],
  Rotation: [['Rotation'], asNumber],
  ClipsDescendants: [['ClipsDescendants'], asBool],
  BorderSizePixel: [['BorderSizePixel'], asNumber],
  BorderColor3: [['BorderColor3'], asColor3],
  Text: [['Text'], asString],
  TextColor3: [['TextColor3'], asColor3],
  TextSize: [['TextSize'], asNumber],
  TextScaled: [['TextScaled'], asBool],
  TextWrapped: [['TextWrapped'], asBool],
  TextXAlignment: [['TextXAlignment'], asEnum(TEXT_X_ALIGNMENT)],
  TextYAlignment: [['TextYAlignment'], asEnum(TEXT_Y_ALIGNMENT)],
  TextTransparency: [['TextTransparency'], asNumber],
  RichText: [['RichText'], asBool],
  TextTruncate: [['TextTruncate'], asEnum(TEXT_TRUNCATE)],
  LineHeight: [['LineHeight'], asNumber],
  AutoButtonColor: [['AutoButtonColor'], asBool],
  PlaceholderText: [['PlaceholderText'], asString],
  PlaceholderColor3: [['PlaceholderColor3'], asColor3],
  ClearTextOnFocus: [['ClearTextOnFocus'], asBool],
  Image: [['ImageContent', 'Image'], asImage],
  ImageColor3: [['ImageColor3'], asColor3],
  ImageTransparency: [['ImageTransparency'], asNumber],
  ScaleType: [['ScaleType'], asEnum(SCALE_TYPE)],
  TileSize: [['TileSize'], asUDim2],
  SliceCenter: [['SliceCenter'], asRect],
  SliceScale: [['SliceScale'], asNumber],
  CanvasSize: [['CanvasSize'], asUDim2],
  ScrollBarThickness: [['ScrollBarThickness'], asNumber],
  AutomaticCanvasSize: [['AutomaticCanvasSize'], asEnum(AUTOMATIC_SIZE)],
  ScrollingDirection: [['ScrollingDirection'], asEnum(SCROLLING_DIRECTION)],
  ScrollBarImageColor3: [['ScrollBarImageColor3'], asColor3],
  ScrollBarImageTransparency: [['ScrollBarImageTransparency'], asNumber],
  AutomaticSize: [['AutomaticSize'], asEnum(AUTOMATIC_SIZE)],
}

// The same for each modifier's properties. UICorner: Studio files store a
// radius per corner; Udimo has one, read from CornerRadius (scripts and
// older files) or the top-left corner.
const MODIFIER_SOURCES: {
  [K in ModifierClass]: Record<
    keyof ModifierProps[K],
    [names: string[], read: Read]
  >
} = {
  UICorner: { CornerRadius: [['CornerRadius', 'TopLeftRadius'], asUDim] },
  UIStroke: {
    Color: [['Color'], asColor3],
    Thickness: [['Thickness'], asNumber],
    Transparency: [['Transparency'], asNumber],
    ApplyStrokeMode: [['ApplyStrokeMode'], asEnum(APPLY_STROKE_MODE)],
  },
  UIGradient: {
    Color: [['Color'], asColorSequence],
    Transparency: [['Transparency'], asNumberSequence],
    Rotation: [['Rotation'], asNumber],
  },
  UIPadding: {
    PaddingTop: [['PaddingTop'], asUDim],
    PaddingBottom: [['PaddingBottom'], asUDim],
    PaddingLeft: [['PaddingLeft'], asUDim],
    PaddingRight: [['PaddingRight'], asUDim],
  },
  UIAspectRatioConstraint: { AspectRatio: [['AspectRatio'], asNumber] },
  UIScale: { Scale: [['Scale'], asNumber] },
  UISizeConstraint: {
    MinSize: [['MinSize'], asVector2],
    MaxSize: [['MaxSize'], asSizeLimit],
  },
  UITextSizeConstraint: {
    MinTextSize: [['MinTextSize'], asNumber],
    MaxTextSize: [['MaxTextSize'], asNumber],
  },
  UIListLayout: {
    FillDirection: [['FillDirection'], asEnum(FILL_DIRECTION)],
    HorizontalAlignment: [
      ['HorizontalAlignment'],
      asEnum(HORIZONTAL_ALIGNMENT),
    ],
    VerticalAlignment: [['VerticalAlignment'], asEnum(VERTICAL_ALIGNMENT)],
    SortOrder: [['SortOrder'], asEnum(SORT_ORDER)],
    Padding: [['Padding'], asUDim],
  },
  UIGridLayout: {
    CellSize: [['CellSize'], asUDim2],
    CellPadding: [['CellPadding'], asUDim2],
    FillDirection: [['FillDirection'], asEnum(FILL_DIRECTION)],
    FillDirectionMaxCells: [['FillDirectionMaxCells'], asNumber],
    HorizontalAlignment: [
      ['HorizontalAlignment'],
      asEnum(HORIZONTAL_ALIGNMENT),
    ],
    VerticalAlignment: [['VerticalAlignment'], asEnum(VERTICAL_ALIGNMENT)],
    SortOrder: [['SortOrder'], asEnum(SORT_ORDER)],
  },
}

// Same value? (Only plain data here: numbers, strings, small objects.)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Reads the properties listed in `sources` from an instance: each one that
// is there, reads, passes its check, and differs from the default. A value
// that's there but wrong (say, LineHeight 5) is left out with a note.
function readProperties(
  instance: RawInstance,
  sources: Record<string, [string[], Read]>,
  checks: Record<string, (value: unknown) => boolean>,
  defaults: Record<string, unknown>,
  label: string,
  notes: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, [names, read]] of Object.entries(sources)) {
    const name = names.find((n) => instance.properties.has(n))
    if (!name) continue
    const value = read(instance.properties.get(name)!)
    if (value === undefined || !checks[key](value)) {
      notes.push(
        `${label}: ${name} has a value Udimo can’t use, so it was left at its default.`,
      )
      continue
    }
    if (!same(value, defaults[key])) out[key] = value
  }
  for (const name of instance.unreadable) {
    notes.push(
      `${label}: ${name} couldn’t be read, so it was left at its default.`,
    )
  }
  return out
}

// A FontFace: a font Udimo has, with its weight and style. A font Udimo
// doesn't have yet falls back to the default, with a note.
function readFont(
  instance: RawInstance,
  label: string,
  notes: string[],
): FontFace | undefined {
  const raw = instance.properties.get('FontFace')
  if (!raw || raw.type !== 'Font') return undefined
  const family = FONT_IDS.find((id) => FONTS[id].family === raw.family)
  const weight = asEnum(FONT_WEIGHT)({ type: 'token', value: raw.weight })
  const style = Object.hasOwn(FONT_STYLE, raw.style) ? raw.style : undefined
  if (!family) {
    // The font's name: the last part of its address ("…/Gotham.json").
    const name = raw.family.split('/').pop()?.replace('.json', '')
    notes.push(
      `${label}: the font ${name} isn’t in Udimo yet, so it uses Source Sans Pro.`,
    )
    return undefined
  }
  if (!weight || !style) {
    notes.push(`${label}: its font weight or style couldn’t be read.`)
    return { family, weight: 'Regular' }
  }
  const face: FontFace = { family, weight: weight as FontFace['weight'] }
  if (style !== 'Normal') face.style = style as FontFace['style']
  return face
}

// ---------- The tree ----------

const nameOf = (instance: RawInstance): string => {
  const name = instance.properties.get('Name')
  return name?.type === 'string' && name.value !== ''
    ? name.value
    : instance.className
}

// Everything inside an instance, counted.
const countInside = (instance: RawInstance): number =>
  instance.children.reduce((n, child) => n + 1 + countInside(child), 0)

// Reads an .rbxmx file's text into an Udimo document, with a report of
// what was left out. Throws RbxmxError for a file that isn't a model, or
// holds nothing Udimo can open.
export function importRbxmx(text: string): ImportResult {
  const top = readRbxmx(text)
  const skipped: SkippedInstance[] = []
  const notes: string[] = []
  const nodes: Record<NodeId, UiNode> = {}
  let imported = 0

  const skip = (instance: RawInstance, path: string) =>
    skipped.push({
      className: instance.className || 'Unknown',
      name: nameOf(instance),
      path,
      inside: countInside(instance),
    })

  // Adds an element (and everything inside it) under `parentId`.
  function addElement(
    instance: RawInstance & { className: ClassName },
    parentId: NodeId,
    path: string,
  ): NodeId {
    const id = createId()
    const name = nameOf(instance)
    const here = path ? `${path}.${name}` : name
    const label = `${instance.className} ${name}`
    const props = readProperties(
      instance,
      PROP_SOURCES,
      PROP_CHECKS,
      defaultProps(instance.className),
      label,
      notes,
    ) as Props
    const font = readFont(instance, label, notes)
    if (font && !same(font, defaultProps(instance.className).FontFace)) {
      props.FontFace = font
    }
    const node: UiNode = {
      id,
      className: instance.className,
      name,
      parentId,
      children: [],
      props,
    }
    nodes[id] = node
    imported++

    const modifiers: Modifiers = {}
    for (const child of instance.children) {
      if (isElement(child.className)) {
        node.children.push(
          addElement(child as RawInstance & { className: ClassName }, id, here),
        )
      } else if (isModifier(child.className)) {
        addModifier(modifiers, child, child.className, `${name}`, here)
      } else {
        skip(child, here)
      }
    }
    if (Object.keys(modifiers).length > 0) node.modifiers = modifiers
    return id
  }

  // Puts a modifier on its element, at most one of each and one layout.
  function addModifier(
    modifiers: Modifiers,
    instance: RawInstance,
    modifier: ModifierClass,
    owner: string,
    path: string,
  ) {
    const label = `${modifier} on ${owner}`
    if (modifiers[modifier]) {
      notes.push(
        `${owner} has more than one ${modifier}; Udimo keeps the first.`,
      )
      skip(instance, path)
      return
    }
    const otherLayout = LAYOUT_MODIFIERS.find(
      (layout) => layout !== modifier && modifiers[layout],
    )
    if (LAYOUT_MODIFIERS.includes(modifier) && otherLayout) {
      notes.push(
        `${owner} has both ${otherLayout} and ${modifier}; Udimo keeps ${otherLayout}.`,
      )
      skip(instance, path)
      return
    }
    if (modifier === 'UICorner') checkCorners(instance, label, notes)
    // (Each modifier's tables line up by name; the loop just can't say so.)
    modifiers[modifier] = readProperties(
      instance,
      MODIFIER_SOURCES[modifier] as Record<string, [string[], Read]>,
      MODIFIER_CHECKS[modifier] as Record<string, (v: unknown) => boolean>,
      MODIFIER_DEFAULTS[modifier] as Record<string, unknown>,
      label,
      notes,
    ) as never
    imported++
    // A modifier has nothing inside it in Roblox; anything there is extra.
    for (const child of instance.children) skip(child, `${path}.${modifier}`)
  }

  // The root: the file's ScreenGui, or a new one holding its elements.
  const screenGui = top.find((item) => item.className === 'ScreenGui')
  const rootId = createId()
  const rootName = screenGui ? nameOf(screenGui) : 'ScreenGui'
  // Where things are, for the report, starts at the file's ScreenGui; in a
  // file without one, at its own top elements (the ScreenGui made to hold
  // them isn't in the file, so naming it would only confuse).
  const rootPath = screenGui ? rootName : ''
  nodes[rootId] = {
    id: rootId,
    className: 'ScreenGui',
    name: rootName,
    parentId: null,
    children: [],
    props: {},
  }
  imported++

  const contents = screenGui ? screenGui.children : top
  for (const item of contents) {
    if (isElement(item.className)) {
      nodes[rootId].children.push(
        addElement(
          item as RawInstance & { className: ClassName },
          rootId,
          rootPath,
        ),
      )
    } else {
      // Includes modifiers straight on the ScreenGui, which Roblox ignores.
      skip(item, rootPath)
    }
  }
  // Anything else at the top of a file with a ScreenGui (a second
  // ScreenGui, a Folder...) is left out.
  if (screenGui) {
    for (const item of top) if (item !== screenGui) skip(item, '')
  }

  if (nodes[rootId].children.length === 0 && !screenGui) {
    throw new RbxmxError(
      'There’s no GUI in this file: no ScreenGui, and no Frames, labels, buttons or images Udimo can open.',
    )
  }

  const document: UiDocument = { rootId, nodes }
  // A last check of the whole document by the project file rules: it
  // should always pass, but if it doesn't, nothing half-made reaches the
  // editor.
  parseProject(serializeProject(document))

  return { document, imported, skipped, notes, wrapped: !screenGui }
}

// UICorner: Udimo has one radius for all four corners. If the file's
// corners differ, the top-left one is used, and the report says so.
function checkCorners(instance: RawInstance, label: string, notes: string[]) {
  const corners = [
    'TopLeftRadius',
    'TopRightRadius',
    'BottomLeftRadius',
    'BottomRightRadius',
  ].map((name) => instance.properties.get(name))
  if (corners.some((corner) => corner && !same(corner, corners[0]))) {
    notes.push(
      `${label}: its corners have different radii; Udimo uses one radius for all four (the top-left one).`,
    )
  }
}
