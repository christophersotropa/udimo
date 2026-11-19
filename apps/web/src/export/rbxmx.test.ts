import { describe, expect, it } from 'vitest'
// A real file saved from Roblox Studio: a ScreenGui > Frame > TextLabel with
// every property left at its default. "?raw" makes Vite load it as a string.
import reference from '../../../../docs/reference/defaults.rbxmx?raw'
// ScreenGui > TextButton and TextBox, side by side, all defaults.
import textReference from '../../../../docs/reference/text-classes.rbxmx?raw'
// ScreenGui > ImageLabel, ImageButton and ScrollingFrame, all defaults.
import imageReference from '../../../../docs/reference/image-classes.rbxmx?raw'
import { createDocumentStore } from '../store/documentStore.ts'
import { documentToRbxmx, escapeXml } from './rbxmx.ts'

// The properties of the first <Item> of `className` in an .rbxmx file, as
// name -> "Type:value" with whitespace removed, so formatting doesn't matter.
function propertiesOf(xml: string, className: string): Map<string, string> {
  const block = xml.match(
    new RegExp(
      `<Item class="${className}"[^>]*>\\s*<Properties>([\\s\\S]*?)</Properties>`,
    ),
  )
  if (!block) throw new Error(`No ${className} in file`)

  const props = new Map<string, string>()
  for (const [, type, name, value] of block[1].matchAll(
    /<(\w+) name="(\w+)">([\s\S]*?)<\/\1>/g,
  )) {
    props.set(name, `${type}:${value.replace(/\s+/g, '')}`)
  }
  return props
}

// ScreenGui > Frame > TextLabel, with no properties set (all defaults).
function defaultDocument() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const frame = addNode(store.getState().document.rootId, 'Frame')
  addNode(frame, 'TextLabel')
  return store.getState().document
}

// ScreenGui > TextButton and TextBox, all defaults, like text-classes.rbxmx.
function textDocument() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  addNode(rootId, 'TextButton')
  addNode(rootId, 'TextBox')
  return store.getState().document
}

// ScreenGui > ImageLabel, ImageButton, ScrollingFrame, like image-classes.rbxmx.
function imageDocument() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  addNode(rootId, 'ImageLabel')
  addNode(rootId, 'ImageButton')
  addNode(rootId, 'ScrollingFrame')
  return store.getState().document
}

// The golden test: for each class, every property we write must match, value
// for value, what Studio wrote in the reference file.
function goldenTest(studioXml: string, ourXml: string, classNames: string[]) {
  describe.each(classNames)(
    'matches the Studio reference file for a default %s',
    (className) => {
      const ours = propertiesOf(ourXml, className)
      const studio = propertiesOf(studioXml, className)

      it.each([...ours])('%s', (name, value) => {
        expect(studio.get(name)).toBe(value)
      })
    },
  )
}

describe('documentToRbxmx', () => {
  goldenTest(reference, documentToRbxmx(defaultDocument()), [
    'ScreenGui',
    'Frame',
    'TextLabel',
  ])
  goldenTest(textReference, documentToRbxmx(textDocument()), [
    'TextButton',
    'TextBox',
  ])
  goldenTest(imageReference, documentToRbxmx(imageDocument()), [
    'ImageLabel',
    'ImageButton',
    'ScrollingFrame',
  ])

  it('writes a pasted image id as an rbxassetid URI, and no image as null', () => {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const rootId = store.getState().document.rootId
    addNode(rootId, 'ImageLabel', { Image: '123456' })
    addNode(rootId, 'ImageButton', { Image: '' })
    const xml = documentToRbxmx(store.getState().document)

    expect(propertiesOf(xml, 'ImageLabel').get('ImageContent')).toBe(
      'Content:<uri>rbxassetid://123456</uri>',
    )
    expect(propertiesOf(xml, 'ImageButton').get('ImageContent')).toBe(
      'Content:<null></null>',
    )
  })

  it('nests children inside their parent', () => {
    const xml = documentToRbxmx(defaultDocument())
    const order = [...xml.matchAll(/<(\/?)Item(?: class="(\w+)")?/g)].map(
      ([, close, className]) => (close ? '/' : className),
    )
    expect(order).toEqual(['ScreenGui', 'Frame', 'TextLabel', '/', '/', '/'])
  })

  it('gives every instance a different referent', () => {
    const xml = documentToRbxmx(defaultDocument())
    const referents = [...xml.matchAll(/referent="(\w+)"/g)].map((m) => m[1])
    expect(new Set(referents).size).toBe(3)
  })

  it('writes the props a node sets, rounding pixel offsets', () => {
    const store = createDocumentStore()
    store.getState().addNode(store.getState().document.rootId, 'TextLabel', {
      Size: { xs: 0.5, xo: 10.6, ys: 0, yo: 40 },
      Text: 'Buy',
    })
    const props = propertiesOf(
      documentToRbxmx(store.getState().document),
      'TextLabel',
    )
    expect(props.get('Size')).toBe(
      'UDim2:<XS>0.5</XS><XO>11</XO><YS>0</YS><YO>40</YO>',
    )
    expect(props.get('Text')).toBe('string:Buy')
  })

  it('ignores the editor-only locked flag', () => {
    const store = createDocumentStore()
    const id = store
      .getState()
      .addNode(store.getState().document.rootId, 'Frame')
    const unlocked = documentToRbxmx(store.getState().document)

    store.getState().setLocked(id, true)
    expect(documentToRbxmx(store.getState().document)).toBe(unlocked)
  })

  it('writes the TextButton and TextBox settings you change', () => {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const rootId = store.getState().document.rootId
    addNode(rootId, 'TextButton', { AutoButtonColor: false })
    addNode(rootId, 'TextBox', {
      Text: '',
      PlaceholderText: 'Code <here>',
      ClearTextOnFocus: false,
    })
    const xml = documentToRbxmx(store.getState().document)

    expect(propertiesOf(xml, 'TextButton').get('AutoButtonColor')).toBe(
      'bool:false',
    )
    const box = propertiesOf(xml, 'TextBox')
    expect(box.get('PlaceholderText')).toBe('string:Code&lt;here&gt;') // spaces stripped by propertiesOf
    expect(box.get('ClearTextOnFocus')).toBe('bool:false')
    expect(box.get('Text')).toBe('string:')
  })

  it('escapes names and text that contain XML characters', () => {
    const store = createDocumentStore()
    const { addNode, renameNode } = store.getState()
    const id = addNode(store.getState().document.rootId, 'TextLabel', {
      Text: 'Tom & Jerry <3',
    })
    renameNode(id, 'Say "hi"')

    const xml = documentToRbxmx(store.getState().document)
    expect(xml).toContain('<string name="Text">Tom &amp; Jerry &lt;3</string>')
    expect(xml).toContain('<string name="Name">Say &quot;hi&quot;</string>')
  })
})

describe('escapeXml', () => {
  it('leaves normal text alone', () => {
    expect(escapeXml('Shop')).toBe('Shop')
  })
})
