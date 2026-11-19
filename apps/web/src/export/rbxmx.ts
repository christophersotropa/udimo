import { isImageClass, isTextClass } from '../model/classes.ts'
import { resolveProps } from '../model/defaults.ts'
import type {
  Color3,
  NodeId,
  UDim2,
  UiDocument,
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
const udim2 = (name: string, v: UDim2) =>
  `<UDim2 name="${name}"><XS>${v.xs}</XS><XO>${Math.round(v.xo)}</XO><YS>${v.ys}</YS><YO>${Math.round(v.yo)}</YO></UDim2>`
const vector2 = (name: string, v: Vector2) =>
  `<Vector2 name="${name}"><X>${v.x}</X><Y>${v.y}</Y></Vector2>`
const color3 = (name: string, c: Color3) =>
  `<Color3 name="${name}"><R>${c.r}</R><G>${c.g}</G><B>${c.b}</B></Color3>`
// An image asset like "rbxassetid://123", or <null> when there is none.
const content = (name: string, url: string) =>
  url
    ? `<Content name="${name}"><url>${escapeXml(url)}</url></Content>`
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

  if (node.className === 'TextButton') {
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
    tags.push(content('Image', p.Image))
  }

  return tags
}

export function documentToRbxmx(doc: UiDocument): string {
  const lines: string[] = ['<roblox version="4">']
  let nextReferent = 0

  // Writes one <Item>, then its children inside it. Tabs show the nesting.
  function writeItem(id: NodeId, depth: number) {
    const node = doc.nodes[id]
    const tab = '\t'.repeat(depth)
    // A referent is a unique label for each instance in the file.
    const referent = `RBX${nextReferent++}`

    lines.push(`${tab}<Item class="${node.className}" referent="${referent}">`)
    lines.push(`${tab}\t<Properties>`)
    for (const tag of propertyTags(doc, id)) lines.push(`${tab}\t\t${tag}`)
    lines.push(`${tab}\t</Properties>`)
    for (const childId of node.children) writeItem(childId, depth + 1)
    lines.push(`${tab}</Item>`)
  }

  writeItem(doc.rootId, 1)
  lines.push('</roblox>')
  return lines.join('\n') + '\n'
}
