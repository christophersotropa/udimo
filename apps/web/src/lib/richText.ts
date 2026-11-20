// Roblox RichText: tags inside a text element's Text that style parts of
// it, like "Buy for <b>50</b> <font color="#FFD700">coins</font>". Only
// used when the element's RichText is on. Plain TypeScript, no React.
//
// This turns the text into "runs": pieces of text, each with the styles of
// the tags around it, which the canvas draws as styled <span>s. It never
// produces HTML, so tags in text can't do anything but style it.
//
// Supported, like Roblox: <b> <i> <u> <s> <br/>, <font> (color, size,
// face, weight, transparency), <mark> (color, transparency), <uppercase>
// or <uc>, <smallcaps> or <sc>, <stroke> (its text is shown; the outline
// itself isn't drawn), comments <!-- -->, and the escapes &lt; &gt; &quot;
// &apos; &amp;. If the tags are broken (an unknown tag, one never closed,
// or closed in the wrong order), Roblox shows the text exactly as typed,
// tags and all, and so does this.

export type RichStyle = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  uppercase?: boolean
  smallcaps?: boolean
  color?: Rgb // <font color>
  size?: number // <font size>, in pixels
  face?: string // <font face>, a font name as written
  weight?: number // <font weight>, 100 to 900
  transparency?: number // <font transparency>, 0 to 1
  mark?: { color: Rgb; transparency: number } // <mark>: a highlight
}

export type Rgb = { r: number; g: number; b: number } // 0 to 255

export type RichRun = { text: string; style: RichStyle } | { lineBreak: true }

// Roblox's font weight names, and the numbers they stand for.
const WEIGHT_NAMES: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  heavy: 900,
}

const ESCAPES: Record<string, string> = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&',
}

// Turns &lt; and friends back into the characters they stand for.
export function unescapeRichText(text: string): string {
  return text.replace(
    /&(lt|gt|quot|apos|amp);/g,
    (_, name: string) => ESCAPES[name],
  )
}

// "#FFD700", "#fd0" or "rgb(255, 215, 0)" as a colour, else null.
export function parseRichColor(value: string): Rgb | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const digits =
      hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1]
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
    }
  }
  const rgb = value
    .trim()
    .match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (rgb) {
    const [r, g, b] = rgb.slice(1).map(Number)
    if ([r, g, b].every((c) => c <= 255)) return { r, g, b }
  }
  return null
}

// A number from a tag's attribute, or null if it isn't one.
function parseNumber(value: string): number | null {
  const number = Number(value.trim())
  return value.trim() !== '' && Number.isFinite(number) ? number : null
}

// A tag's attributes, like color="#fff" size='20', as a name -> value map,
// or null if they don't read as attributes.
function parseAttributes(source: string): Record<string, string> | null {
  const attributes: Record<string, string> = {}
  const pattern = /\s*([a-z]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/giy
  let index = 0
  while (index < source.length) {
    pattern.lastIndex = index
    const match = pattern.exec(source)
    if (!match) return source.slice(index).trim() === '' ? attributes : null
    attributes[match[1].toLowerCase()] = unescapeRichText(match[2] ?? match[3])
    index = pattern.lastIndex
  }
  return attributes
}

// What a <font> or <mark> tag adds to the style, or null if it's broken.
function tagStyle(
  name: string,
  attributes: Record<string, string>,
): RichStyle | null {
  const style: RichStyle = {}
  if (name === 'font') {
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'color') {
        const color = parseRichColor(value)
        if (color) style.color = color
      } else if (key === 'size') {
        const size = parseNumber(value)
        if (size !== null && size > 0) style.size = Math.min(size, 100)
      } else if (key === 'face' || key === 'family') {
        style.face = value
      } else if (key === 'weight') {
        const weight =
          WEIGHT_NAMES[value.trim().toLowerCase()] ?? parseNumber(value)
        if (weight !== null && weight >= 100 && weight <= 900) {
          style.weight = weight
        }
      } else if (key === 'transparency') {
        const transparency = parseNumber(value)
        if (transparency !== null) {
          style.transparency = Math.min(1, Math.max(0, transparency))
        }
      }
    }
  }
  if (name === 'mark') {
    const color = parseRichColor(attributes.color ?? '') ?? {
      r: 255,
      g: 255,
      b: 0,
    }
    const transparency = parseNumber(attributes.transparency ?? '0') ?? 0
    style.mark = { color, transparency: Math.min(1, Math.max(0, transparency)) }
  }
  return style
}

// The style a simple tag (no attributes) adds.
const SIMPLE_TAGS: Record<string, RichStyle> = {
  b: { bold: true },
  i: { italic: true },
  u: { underline: true },
  s: { strike: true },
  uppercase: { uppercase: true },
  uc: { uppercase: true },
  smallcaps: { smallcaps: true },
  sc: { smallcaps: true },
  stroke: {}, // the outline isn't drawn; the text inside is
}
const TAGS_WITH_ATTRIBUTES = new Set(['font', 'mark', 'stroke'])

// The text as runs of styled text and line breaks. Broken tags: the whole
// text as typed, unstyled.
export function parseRichText(source: string): RichRun[] {
  const asTyped: RichRun[] = [{ text: source, style: {} }]
  const runs: RichRun[] = []
  // The open tags, innermost last, each with the style in force inside it.
  const open: { name: string; style: RichStyle }[] = []
  const current = () => open.at(-1)?.style ?? {}
  const addText = (raw: string) => {
    if (raw !== '') runs.push({ text: unescapeRichText(raw), style: current() })
  }

  // A tag, or a comment: <name attrs>, </name>, <br/>, <!-- ... -->.
  const tagPattern = /<!--[\s\S]*?-->|<(\/?)([a-z]+)([^<>]*?)(\/?)>/gi
  let last = 0
  for (const match of source.matchAll(tagPattern)) {
    addText(source.slice(last, match.index))
    last = match.index + match[0].length
    if (match[0].startsWith('<!--')) continue // a comment shows nothing

    const [, closing, rawName, rest, selfClosing] = match
    const name = rawName.toLowerCase()
    if (name === 'br' && !closing) {
      if (rest.trim() !== '') return asTyped
      runs.push({ lineBreak: true })
      continue
    }
    if (!(name in SIMPLE_TAGS) && !TAGS_WITH_ATTRIBUTES.has(name)) {
      return asTyped // a tag Roblox doesn't know
    }
    if (closing) {
      if (rest.trim() !== '' || open.at(-1)?.name !== name) return asTyped
      open.pop()
      continue
    }
    if (selfClosing) return asTyped
    const attributes = parseAttributes(rest)
    if (!attributes) return asTyped
    if (!TAGS_WITH_ATTRIBUTES.has(name) && Object.keys(attributes).length) {
      return asTyped // <b color="...">: simple tags take no attributes
    }
    const added = { ...SIMPLE_TAGS[name], ...tagStyle(name, attributes) }
    open.push({ name, style: { ...current(), ...added } })
  }
  addText(source.slice(last))
  if (open.length > 0) return asTyped // a tag never closed
  return runs
}

// The words a rich text shows, without its tags: for measuring it.
export function richTextPlain(source: string): string {
  return parseRichText(source)
    .map((run) => ('lineBreak' in run ? '\n' : run.text))
    .join('')
}
