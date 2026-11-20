import { describe, expect, it } from 'vitest'
import { parseRichColor, parseRichText, richTextPlain } from './richText.ts'

describe('parseRichText', () => {
  it('styles text inside simple tags', () => {
    expect(parseRichText('Buy <b>now</b>!')).toEqual([
      { text: 'Buy ', style: {} },
      { text: 'now', style: { bold: true } },
      { text: '!', style: {} },
    ])
  })

  it('combines nested tags', () => {
    expect(parseRichText('<b><i>both</i> bold</b>')).toEqual([
      { text: 'both', style: { bold: true, italic: true } },
      { text: ' bold', style: { bold: true } },
    ])
  })

  it('reads <font> attributes', () => {
    const [run] = parseRichText(
      '<font color="#FFD700" size="30" weight="heavy" transparency="0.5" face="Roboto">gold</font>',
    )
    expect(run).toEqual({
      text: 'gold',
      style: {
        color: { r: 255, g: 215, b: 0 },
        size: 30,
        weight: 900,
        transparency: 0.5,
        face: 'Roboto',
      },
    })
  })

  it('reads line breaks, comments and escapes', () => {
    expect(parseRichText('a<br/>b<!-- note -->&lt;3 &amp; more')).toEqual([
      { text: 'a', style: {} },
      { lineBreak: true },
      { text: 'b', style: {} },
      { text: '<3 & more', style: {} },
    ])
  })

  it('highlights <mark>, yellow unless told otherwise', () => {
    expect(parseRichText('<mark>hi</mark>')[0]).toEqual({
      text: 'hi',
      style: { mark: { color: { r: 255, g: 255, b: 0 }, transparency: 0 } },
    })
  })

  it('shows broken tags as typed, like Roblox', () => {
    for (const text of [
      '<b>never closed',
      '<b><i>crossed</b></i>',
      '<blink>unknown</blink>',
      '</b>closed first',
      '<b color="#fff">simple tags take no attributes</b>',
      '<font color=red>unquoted</font>',
    ]) {
      expect(parseRichText(text)).toEqual([{ text, style: {} }])
    }
  })

  it('ignores attribute values that make no sense', () => {
    expect(
      parseRichText('<font color="nope" size="-4" weight="999">x</font>')[0],
    ).toEqual({ text: 'x', style: {} })
  })
})

describe('parseRichColor', () => {
  it('reads hex and rgb()', () => {
    expect(parseRichColor('#fd0')).toEqual({ r: 255, g: 221, b: 0 })
    expect(parseRichColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 })
    expect(parseRichColor('rgb(300, 0, 0)')).toBeNull()
    expect(parseRichColor('url(evil)')).toBeNull()
  })
})

describe('richTextPlain', () => {
  it('gives the words without the tags', () => {
    expect(richTextPlain('<b>Buy</b><br/>for &lt;50')).toBe('Buy\nfor <50')
  })
})
