import { FONT_WEIGHT } from '../model/enums.ts'
import type { UiDocument } from '../model/types.ts'
import { type ExportInstance, exportTree, type Property } from './instances.ts'

// Writes a document as a .rbxmx file: Roblox's XML model format, version 4.
// Reference: https://dom.rojo.space/xml.html and the Studio files in
// docs/reference/. Which properties each instance gets is decided in
// instances.ts; this file only knows how to write them as XML.

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

// A number as Studio writes it: infinity is INF (UISizeConstraint's
// MaxSize with no limit), everything else as JavaScript prints it.
function num(n: number): string {
  if (n === Infinity) return 'INF'
  if (n === -Infinity) return '-INF'
  return String(n)
}

// One property as an XML tag, the way Studio writes it.
function propertyTag({ name, value }: Property): string {
  const tag = (type: string, inner: string) =>
    `<${type} name="${name}">${inner}</${type}>`

  switch (value.type) {
    case 'string':
      return tag('string', escapeXml(value.value))
    case 'bool':
    case 'int':
    case 'float':
      return tag(value.type, String(value.value))
    case 'enum':
      // Enums are written as numbers ("tokens").
      return tag('token', String(value.token))
    case 'UDim':
      return tag('UDim', `<S>${value.value.s}</S><O>${value.value.o}</O>`)
    case 'UDim2': {
      const v = value.value
      return tag(
        'UDim2',
        `<XS>${v.xs}</XS><XO>${v.xo}</XO><YS>${v.ys}</YS><YO>${v.yo}</YO>`,
      )
    }
    case 'Vector2':
      return tag(
        'Vector2',
        `<X>${num(value.value.x)}</X><Y>${num(value.value.y)}</Y>`,
      )
    case 'Rect': {
      // Studio calls this type Rect2D, corners as <min> and <max>.
      const r = value.value
      return tag(
        'Rect2D',
        `<min><X>${r.minX}</X><Y>${r.minY}</Y></min><max><X>${r.maxX}</X><Y>${r.maxY}</Y></max>`,
      )
    }
    case 'Color3': {
      const c = value.value
      return tag('Color3', `<R>${c.r}</R><G>${c.g}</G><B>${c.b}</B>`)
    }
    case 'Content':
      // An image as a <uri>, or <null> when there is none.
      return tag(
        'Content',
        value.value ? `<uri>${escapeXml(value.value)}</uri>` : '<null></null>',
      )
    case 'Font': {
      const cached = value.cachedFaceId
        ? `<CachedFaceId><url>${escapeXml(value.cachedFaceId)}</url></CachedFaceId>`
        : ''
      return tag(
        'Font',
        `<Family><url>${escapeXml(value.family)}</url></Family><Weight>${FONT_WEIGHT[value.weight]}</Weight><Style>${value.style}</Style>${cached}`,
      )
    }
    // Sequences are plain numbers, a group per keypoint, the way Studio
    // does: "time R G B 0" for colors, "time value 0" for numbers. The
    // trailing 0 is the "envelope", which Roblox only uses for particles.
    case 'ColorSequence':
      return tag(
        'ColorSequence',
        value.value
          .map(
            ({ time, color }) => `${time} ${color.r} ${color.g} ${color.b} 0 `,
          )
          .join(''),
      )
    case 'source':
      // Script code goes in a CDATA section, which keeps it exactly as
      // written (no &lt; escapes). A CDATA section ends at "]]>", so any
      // "]]>" in the code is split across two sections.
      return tag(
        'ProtectedString',
        `<![CDATA[${value.value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`,
      )
    case 'NumberSequence':
      return tag(
        'NumberSequence',
        value.value.map(({ time, value: v }) => `${time} ${v} 0 `).join(''),
      )
  }
}

export function documentToRbxmx(
  doc: UiDocument,
  options: { resetOnSpawn?: boolean; buttonScript?: boolean } = {},
): string {
  const lines: string[] = ['<roblox version="4">']
  let nextReferent = 0

  // Writes one <Item> with its properties, then its children inside it.
  // Tabs show the nesting.
  function writeItem(instance: ExportInstance, depth: number) {
    const tab = '\t'.repeat(depth)
    // A referent is a unique label for each instance in the file.
    const referent = `RBX${nextReferent++}`
    lines.push(
      `${tab}<Item class="${instance.className}" referent="${referent}">`,
    )
    lines.push(`${tab}\t<Properties>`)
    for (const property of instance.properties) {
      if (property.only === 'luau') continue
      lines.push(`${tab}\t\t${propertyTag(property)}`)
    }
    lines.push(`${tab}\t</Properties>`)
    for (const child of instance.children) writeItem(child, depth + 1)
    lines.push(`${tab}</Item>`)
  }

  writeItem(exportTree(doc, options), 1)
  lines.push('</roblox>')
  return lines.join('\n') + '\n'
}
