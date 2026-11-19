import { toContentUri } from '../lib/assets.ts'
import { isImageClass, isTextClass } from '../model/classes.ts'
import {
  FILL_DIRECTION,
  HORIZONTAL_ALIGNMENT,
  SORT_ORDER,
  VERTICAL_ALIGNMENT,
} from '../model/enums.ts'
import { resolveProps } from '../model/defaults.ts'
import { MODIFIER_CLASSES, resolveModifier } from '../model/modifiers.ts'
import type {
  Color3,
  ColorKeypoint,
  ModifierClass,
  ModifierProps,
  NodeId,
  NumberKeypoint,
  UDim,
  UDim2,
  UiDocument,
  UiNode,
  Vector2,
} from '../model/types.ts'

// Turns a document into a .rbxmx file: Roblox's XML model format, version 4.
// Reference: https://dom.rojo.space/xml.html and docs/reference/defaults.rbxmx.
//
// Like Studio, it writes every supported property in full, with defaults
// filled in, instead of leaving any out. So the file never depends on what
// Roblox assumes for a missing property.

// Enum values are written as numbers ("tokens"). Enum.ZIndexBehavior.Sibling = 1:
// children draw above their parent, which is how the canvas draws them too.
const Z_INDEX_BEHAVIOR_SIBLING = 1

// Text can contain characters that mean something in XML, like < and &.
// Escaping swaps them for codes (&lt; &amp;) so they come back out as text.
export function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

// ---------- One XML tag per property type ----------
// Offsets and whole-number properties are integers in Roblox, so they're rounded.

const string = (name: string, value: string) =>
  `<string name="${name}">${escapeXml(value)}</string>`
const bool = (name: string, value: boolean) =>
  `<bool name="${name}">${value}</bool>`
const int = (name: string, value: number) =>
  `<int name="${name}">${Math.round(value)}</int>`
const float = (name: string, value: number) =>
  `<float name="${name}">${value}</float>`
const token = (name: string, value: number) =>
  `<token name="${name}">${value}</token>`
const udim = (name: string, v: UDim) =>
  `<UDim name="${name}"><S>${v.s}</S><O>${Math.round(v.o)}</O></UDim>`
const udim2 = (name: string, v: UDim2) =>
  `<UDim2 name="${name}"><XS>${v.xs}</XS><XO>${Math.round(v.xo)}</XO><YS>${v.ys}</YS><YO>${Math.round(v.yo)}</YO></UDim2>`
const vector2 = (name: string, v: Vector2) =>
  `<Vector2 name="${name}"><X>${v.x}</X><Y>${v.y}</Y></Vector2>`
const color3 = (name: string, c: Color3) =>
  `<Color3 name="${name}"><R>${c.r}</R><G>${c.g}</G><B>${c.b}</B></Color3>`
// Sequences are written as plain numbers, a group per keypoint, the way
// Studio does: "time R G B 0" for colors, "time value 0" for numbers. The
// trailing 0 is the "envelope", a random spread Roblox only uses for
// particles.
const colorSequence = (name: string, keypoints: ColorKeypoint[]) =>
  `<ColorSequence name="${name}">${keypoints
    .map(({ time, color }) => `${time} ${color.r} ${color.g} ${color.b} 0 `)
    .join('')}</ColorSequence>`
const numberSequence = (name: string, keypoints: NumberKeypoint[]) =>
  `<NumberSequence name="${name}">${keypoints
    .map(({ time, value }) => `${time} ${value} 0 `)
    .join('')}</NumberSequence>`
// An image like "rbxassetid://123", or <null> when there is none. Studio
// now saves images as <uri> inside a *Content property (ImageContent), not
// the older Image property with <url>: see docs/reference/image-classes.rbxmx.
const content = (name: string, uri: string) =>
  uri
    ? `<Content name="${name}"><uri>${escapeXml(uri)}</uri></Content>`
    : `<Content name="${name}"><null></null></Content>`

// Studio's default font (Source Sans Pro, regular), written the way Studio does.
const DEFAULT_FONT =
  '<Font name="FontFace"><Family><url>rbxasset://fonts/families/SourceSansPro.json</url></Family><Weight>400</Weight><Style>Normal</Style><CachedFaceId><url>rbxasset://fonts/SourceSansPro-Regular.ttf</url></CachedFaceId></Font>'

// ---------- Writing the tree ----------

function propertyTags(doc: UiDocument, id: NodeId): string[] {
  const node = doc.nodes[id]
  const tags = [string('Name', node.name)]

  if (node.className === 'ScreenGui') {
    tags.push(token('ZIndexBehavior', Z_INDEX_BEHAVIOR_SIBLING))
    return tags
  }

  const p = resolveProps(node)
  tags.push(
    vector2('AnchorPoint', p.AnchorPoint),
    color3('BackgroundColor3', p.BackgroundColor3),
    float('BackgroundTransparency', p.BackgroundTransparency),
    int('BorderSizePixel', 0), // the canvas draws no borders yet
    int('LayoutOrder', p.LayoutOrder),
    udim2('Position', p.Position),
    udim2('Size', p.Size),
    bool('Visible', p.Visible),
    int('ZIndex', p.ZIndex),
  )

  if (isTextClass(node.className)) {
    tags.push(
      DEFAULT_FONT,
      string('Text', p.Text),
      color3('TextColor3', p.TextColor3),
      bool('TextScaled', p.TextScaled),
      float('TextSize', p.TextSize),
    )
  }

  if (node.className === 'TextButton' || node.className === 'ImageButton') {
    tags.push(bool('AutoButtonColor', p.AutoButtonColor))
  }

  if (node.className === 'TextBox') {
    tags.push(
      bool('ClearTextOnFocus', p.ClearTextOnFocus),
      color3('PlaceholderColor3', p.PlaceholderColor3),
      string('PlaceholderText', p.PlaceholderText),
    )
  }

  if (isImageClass(node.className)) {
    // A pasted id or link becomes a proper rbxassetid:// URI.
    tags.push(content('ImageContent', toContentUri(p.Image)))
  }

  if (node.className === 'ScrollingFrame') {
    tags.push(
      udim2('CanvasSize', p.CanvasSize),
      int('ScrollBarThickness', p.ScrollBarThickness),
    )
  }

  return tags
}

// How each modifier is written: its property tags, from its props with the
// defaults filled in. Typed so every modifier must have an entry here.
const MODIFIER_TAGS: {
  [K in ModifierClass]: (props: Required<ModifierProps[K]>) => string[]
} = {
  // Studio now saves a radius per corner. Udimo has one radius for all four.
  UICorner: ({ CornerRadius }) => [
    udim('BottomLeftRadius', CornerRadius),
    udim('BottomRightRadius', CornerRadius),
    udim('TopLeftRadius', CornerRadius),
    udim('TopRightRadius', CornerRadius),
  ],
  UIStroke: ({ Color, Thickness, Transparency }) => [
    color3('Color', Color),
    float('Thickness', Thickness),
    float('Transparency', Transparency),
  ],
  UIGradient: ({ Color, Transparency, Rotation }) => [
    colorSequence('Color', Color),
    numberSequence('Transparency', Transparency),
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
  UIListLayout: (list) => [
    token('FillDirection', FILL_DIRECTION[list.FillDirection]),
    token(
      'HorizontalAlignment',
      HORIZONTAL_ALIGNMENT[list.HorizontalAlignment],
    ),
    udim('Padding', list.Padding),
    token('SortOrder', SORT_ORDER[list.SortOrder]),
    token('VerticalAlignment', VERTICAL_ALIGNMENT[list.VerticalAlignment]),
  ],
  UIGridLayout: (grid) => [
    udim2('CellPadding', grid.CellPadding),
    udim2('CellSize', grid.CellSize),
    token('FillDirection', FILL_DIRECTION[grid.FillDirection]),
    int('FillDirectionMaxCells', grid.FillDirectionMaxCells),
    token(
      'HorizontalAlignment',
      HORIZONTAL_ALIGNMENT[grid.HorizontalAlignment],
    ),
    token('SortOrder', SORT_ORDER[grid.SortOrder]),
    token('VerticalAlignment', VERTICAL_ALIGNMENT[grid.VerticalAlignment]),
  ],
}

// An element's modifiers, as the child instances Roblox expects.
function modifierItems(node: UiNode): { className: string; tags: string[] }[] {
  const items: { className: string; tags: string[] }[] = []
  for (const modifier of MODIFIER_CLASSES) {
    const props = resolveModifier(node, modifier)
    if (!props) continue
    // TypeScript can't follow that `props` belongs to this same `modifier`
    // inside a loop, so the lookup is widened by hand.
    const tagsFor = MODIFIER_TAGS[modifier] as (p: typeof props) => string[]
    items.push({
      className: modifier,
      tags: [string('Name', modifier), ...tagsFor(props)],
    })
  }
  return items
}

export function documentToRbxmx(doc: UiDocument): string {
  const lines: string[] = ['<roblox version="4">']
  let nextReferent = 0

  // Writes one <Item> with its properties, then whatever goes inside it.
  // Tabs show the nesting.
  function writeItem(
    className: string,
    tags: string[],
    depth: number,
    writeInside: () => void = () => {},
  ) {
    const tab = '\t'.repeat(depth)
    // A referent is a unique label for each instance in the file.
    const referent = `RBX${nextReferent++}`
    lines.push(`${tab}<Item class="${className}" referent="${referent}">`)
    lines.push(`${tab}\t<Properties>`)
    for (const tag of tags) lines.push(`${tab}\t\t${tag}`)
    lines.push(`${tab}\t</Properties>`)
    writeInside()
    lines.push(`${tab}</Item>`)
  }

  // An element, then its modifiers and its children inside it.
  function writeNode(id: NodeId, depth: number) {
    const node = doc.nodes[id]
    writeItem(node.className, propertyTags(doc, id), depth, () => {
      for (const item of modifierItems(node)) {
        writeItem(item.className, item.tags, depth + 1)
      }
      for (const childId of node.children) writeNode(childId, depth + 1)
    })
  }

  writeNode(doc.rootId, 1)
  lines.push('</roblox>')
  return lines.join('\n') + '\n'
}
