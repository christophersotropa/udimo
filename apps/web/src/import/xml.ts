// A small XML reader, enough for Roblox's .rbxmx files: elements,
// attributes, text, character codes like &lt;, comments, and CDATA sections
// (raw text, which Roblox uses for script code). Plain TypeScript, so it
// runs the same in the browser and in the tests (Node has no built-in XML
// reader, so a library would otherwise be needed).
//
// It deliberately doesn't support DTDs (<!DOCTYPE ...>): Roblox never writes
// one, and they're how "billion laughs" files make XML readers expand a few
// bytes into gigabytes. A file with one is refused.

export type XmlElement = {
  name: string
  attributes: Record<string, string>
  children: XmlNode[]
}
// A child is an element or a run of text.
export type XmlNode = XmlElement | string

export class XmlError extends Error {}

// The five named codes; numbered ones (&#60; &#x3C;) are handled below.
const ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
}

// Turns character codes back into the characters they stand for.
function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const point =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10)
      // Anything outside Unicode isn't a real character.
      if (!(point >= 0 && point <= 0x10ffff)) {
        throw new XmlError(`Unknown character code ${match}`)
      }
      return String.fromCodePoint(point)
    }
    const named = ENTITIES[code]
    if (named === undefined) throw new XmlError(`Unknown code ${match}`)
    return named
  })
}

// Element and attribute names: letters, digits and _ - . : after a letter.
const NAME = /[A-Za-z_:][\w.:-]*/y

// Reads a whole document and returns its outermost element.
export function parseXml(text: string): XmlElement {
  let at = 0 // where we are in the text

  const fail = (message: string): never => {
    // Line numbers make a broken file easier to find a problem in.
    const line = text.slice(0, at).split('\n').length
    throw new XmlError(`${message} (line ${line})`)
  }

  function skipSpace() {
    while (at < text.length && /\s/.test(text[at])) at++
  }

  function readName(): string {
    NAME.lastIndex = at
    const match = NAME.exec(text)
    if (!match) fail('Expected a name')
    at += match![0].length
    return match![0]
  }

  // Skips the parts that hold no content: the <?xml ...?> line,
  // <!-- comments -->, and whitespace. Refuses DTDs.
  function skipMisc() {
    for (;;) {
      skipSpace()
      if (text.startsWith('<?', at)) {
        const end = text.indexOf('?>', at)
        if (end < 0) fail('Unclosed <?')
        at = end + 2
      } else if (text.startsWith('<!--', at)) {
        const end = text.indexOf('-->', at)
        if (end < 0) fail('Unclosed comment')
        at = end + 3
      } else if (text.startsWith('<!DOCTYPE', at)) {
        fail('DOCTYPE declarations are not supported')
      } else {
        return
      }
    }
  }

  // Reads <name attr="value" ...> or <name ... />, then (unless it closed
  // itself) its children up to </name>.
  function readElement(): XmlElement {
    if (text[at] !== '<') fail('Expected an element')
    at++
    const name = readName()
    const attributes: Record<string, string> = {}
    for (;;) {
      skipSpace()
      if (text.startsWith('/>', at)) {
        at += 2
        return { name, attributes, children: [] }
      }
      if (text[at] === '>') {
        at++
        break
      }
      const attribute = readName()
      skipSpace()
      if (text[at] !== '=') fail(`Expected = after ${attribute}`)
      at++
      skipSpace()
      const quote = text[at]
      if (quote !== '"' && quote !== "'") fail('Expected a quoted value')
      const end = text.indexOf(quote, at + 1)
      if (end < 0) fail('Unclosed attribute value')
      attributes[attribute] = decode(text.slice(at + 1, end))
      at = end + 1
    }

    const children: XmlNode[] = []
    for (;;) {
      if (at >= text.length) fail(`Unclosed <${name}>`)
      if (text.startsWith('</', at)) {
        at += 2
        const closing = readName()
        if (closing !== name) fail(`Expected </${name}>, found </${closing}>`)
        skipSpace()
        if (text[at] !== '>') fail('Expected >')
        at++
        return { name, attributes, children }
      }
      if (text.startsWith('<![CDATA[', at)) {
        // Raw text, taken exactly as written (no character codes).
        const end = text.indexOf(']]>', at)
        if (end < 0) fail('Unclosed CDATA section')
        children.push(text.slice(at + 9, end))
        at = end + 3
      } else if (text.startsWith('<!--', at)) {
        const end = text.indexOf('-->', at)
        if (end < 0) fail('Unclosed comment')
        at = end + 3
      } else if (text[at] === '<') {
        children.push(readElement())
      } else {
        const end = text.indexOf('<', at)
        children.push(decode(text.slice(at, end < 0 ? text.length : end)))
        at = end < 0 ? text.length : end
      }
    }
  }

  skipMisc()
  if (at >= text.length) fail('The file is empty')
  const root = readElement()
  skipMisc()
  if (at < text.length) fail('Unexpected content after the end')
  return root
}

// The child elements of an element, skipping its text.
export function elementsOf(element: XmlElement): XmlElement[] {
  return element.children.filter(
    (child): child is XmlElement => typeof child !== 'string',
  )
}

// All the text inside an element, joined (CDATA sections included).
export function textOf(element: XmlElement): string {
  return element.children
    .map((child) => (typeof child === 'string' ? child : textOf(child)))
    .join('')
}

// The first child element called `name`, if any.
export function childNamed(
  element: XmlElement,
  name: string,
): XmlElement | undefined {
  return elementsOf(element).find((child) => child.name === name)
}
