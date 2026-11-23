import { describe, expect, it } from 'vitest'
import { childNamed, elementsOf, parseXml, textOf, XmlError } from './xml.ts'

describe('parseXml', () => {
  it('reads elements, attributes and text', () => {
    const root = parseXml(
      '<?xml version="1.0"?>\n<roblox version="4"><Item class="Frame"><string name="Name">Shop</string></Item></roblox>',
    )
    expect(root.name).toBe('roblox')
    expect(root.attributes).toEqual({ version: '4' })
    const item = elementsOf(root)[0]
    expect(item.attributes.class).toBe('Frame')
    expect(textOf(childNamed(item, 'string')!)).toBe('Shop')
  })

  it('turns character codes back into characters', () => {
    const root = parseXml(
      `<a t="&quot;hi&quot;">&lt;b&gt;bold&lt;/b&gt; &amp; &#60;&#x3E;&apos;</a>`,
    )
    expect(root.attributes.t).toBe('"hi"')
    expect(textOf(root)).toBe("<b>bold</b> & <>'")
  })

  it('keeps CDATA sections exactly as written', () => {
    const root = parseXml('<s><![CDATA[if a < b and c > d then end]]></s>')
    expect(textOf(root)).toBe('if a < b and c > d then end')
  })

  it('reads self-closing tags, comments and single quotes', () => {
    const root = parseXml(
      "<a><!-- a note --><b x='1'/><c></c></a><!-- after -->",
    )
    expect(elementsOf(root).map((e) => e.name)).toEqual(['b', 'c'])
    expect(elementsOf(root)[0].attributes.x).toBe('1')
  })

  it('keeps whitespace text, so values can be trimmed by the reader', () => {
    expect(textOf(parseXml('<a>  12 </a>'))).toBe('  12 ')
  })

  it.each([
    ['', 'empty'],
    ['not xml at all', 'Expected an element'],
    ['<a><b></a>', 'Expected </b>'],
    ['<a>', 'Unclosed <a>'],
    ['<a x=1></a>', 'quoted'],
    ['<a>&nope;</a>', 'Unknown code'],
    ['<a></a><b></b>', 'after the end'],
    ['<!DOCTYPE a [<!ENTITY x "y">]><a></a>', 'DOCTYPE'],
  ])('refuses broken XML: %s', (text, message) => {
    expect(() => parseXml(text)).toThrow(XmlError)
    expect(() => parseXml(text)).toThrow(message)
  })

  it('says which line a problem is on', () => {
    expect(() => parseXml('<a>\n<b>\n</a>')).toThrow('(line 3)')
  })
})
