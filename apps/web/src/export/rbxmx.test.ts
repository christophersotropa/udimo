import { describe, expect, it } from 'vitest'
// A real file saved from Roblox Studio: a ScreenGui > Frame > TextLabel with
// every property left at its default. "?raw" makes Vite load it as a string.
import reference from '../../../../docs/reference/defaults.rbxmx?raw'
// ScreenGui > TextButton and TextBox, side by side, all defaults.
import textReference from '../../../../docs/reference/text-classes.rbxmx?raw'
// ScreenGui > ImageLabel, ImageButton and ScrollingFrame, all defaults.
import imageReference from '../../../../docs/reference/image-classes.rbxmx?raw'
// ScreenGui > Frame > UICorner and UIStroke, all defaults.
import modifierReference from '../../../../docs/reference/corner-stroke.rbxmx?raw'
// ScreenGui > Frame > UIGradient, UIPadding and UIAspectRatioConstraint.
import layoutModifierReference from '../../../../docs/reference/gradient-padding-aspect.rbxmx?raw'
// ScreenGui > Frame > UIListLayout, and Frame > UIGridLayout.
import layoutReference from '../../../../docs/reference/list-grid-layouts.rbxmx?raw'
// ScreenGui > TextLabels named after their fonts.
import fontReference from '../../../../docs/reference/fonts.rbxmx?raw'
// Seven TextLabels, each with one text option changed (build 49).
import textOptionsReference from '../../../../docs/reference/text-options.rbxmx?raw'
// Six ImageLabels, each with one image option changed (build 50).
import imageOptionsReference from '../../../../docs/reference/image-options.rbxmx?raw'
// A TextLabel with UIScale, UISizeConstraint and UITextSizeConstraint at
// their defaults, then one of each changed (build 51).
import sizingReference from '../../../../docs/reference/sizing.rbxmx?raw'
import type { Props } from '../model/types.ts'
import { createDocumentStore } from '../store/documentStore.ts'
import { documentToRbxmx, escapeXml } from './rbxmx.ts'
import {
  allPropertiesOf,
  propertiesOf,
  propertiesOfNamed,
} from './testRbxmx.ts'

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

// ScreenGui > Frame with a default UICorner and UIStroke.
function modifierDocument() {
  const store = createDocumentStore()
  const { addNode, addModifier } = store.getState()
  const frame = addNode(store.getState().document.rootId, 'Frame')
  addModifier(frame, 'UICorner')
  addModifier(frame, 'UIStroke')
  return store.getState().document
}

// ScreenGui > Frame with a default UIGradient, UIPadding and
// UIAspectRatioConstraint.
function layoutModifierDocument() {
  const store = createDocumentStore()
  const { addNode, addModifier } = store.getState()
  const frame = addNode(store.getState().document.rootId, 'Frame')
  addModifier(frame, 'UIGradient')
  addModifier(frame, 'UIPadding')
  addModifier(frame, 'UIAspectRatioConstraint')
  return store.getState().document
}

// Two Frames, one with a default UIListLayout, one with a UIGridLayout.
function layoutDocument() {
  const store = createDocumentStore()
  const { addNode, addModifier } = store.getState()
  const rootId = store.getState().document.rootId
  addModifier(addNode(rootId, 'Frame'), 'UIListLayout')
  addModifier(addNode(rootId, 'Frame'), 'UIGridLayout')
  return store.getState().document
}

// Like propertiesOf, but for the <Item> whose Name is `name`.
// The TextLabels in text-options.rbxmx, in file order: what each one has
// changed from the defaults.
const TEXT_OPTION_LABELS: [string, Props][] = [
  ['TextXAlignment Left', { TextXAlignment: 'Left' }],
  ['TextYAlignment Top', { TextYAlignment: 'Top' }],
  ['TextTransparency 0.5', { TextTransparency: 0.5 }],
  ['RichText', { RichText: true, Text: '<b>bold</b>' }],
  ['TextTruncate AtEnd', { TextTruncate: 'AtEnd' }],
  ['LineHeight 1.5', { LineHeight: 1.5 }],
  ['TextWrapped', { TextWrapped: true }],
]

// The ImageLabels in image-options.rbxmx, in file order.
const IMAGE_OPTION_LABELS: [string, Props][] = [
  ['ImageColor3 black', { ImageColor3: { r: 0, g: 0, b: 0 } }],
  ['ImageTransparency 0.5', { ImageTransparency: 0.5 }],
  ['ScaleType Fit', { ScaleType: 'Fit' }],
  ['ScaleType Crop', { ScaleType: 'Crop' }],
  [
    'ScaleType Tile, TileSize {2, 0}, {1, 0}',
    { ScaleType: 'Tile', TileSize: { xs: 2, xo: 0, ys: 1, yo: 0 } },
  ],
  [
    'ScaleType Slice, SliceCenter 0, 0, 2, 0, SliceScale 2',
    {
      ScaleType: 'Slice',
      SliceCenter: { minX: 0, minY: 0, maxX: 2, maxY: 0 },
      SliceScale: 2,
    },
  ],
]

// The labels in fonts.rbxmx: name -> font.
const FONT_LABELS = {
  BuilderSans: 'BuilderSans',
  FredokaOne: 'FredokaOne',
  LuckiestGuy: 'LuckiestGuy',
  Roboto: 'Roboto',
  Arial: 'Arial',
} as const

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
  goldenTest(modifierReference, documentToRbxmx(modifierDocument()), [
    'UICorner',
    'UIStroke',
  ])
  goldenTest(
    layoutModifierReference,
    documentToRbxmx(layoutModifierDocument()),
    ['UIGradient', 'UIPadding', 'UIAspectRatioConstraint'],
  )

  goldenTest(layoutReference, documentToRbxmx(layoutDocument()), [
    'UIListLayout',
    'UIGridLayout',
  ])

  describe('matches the Studio reference file for text options', () => {
    const store = createDocumentStore()
    const rootId = store.getState().document.rootId
    for (const [, props] of TEXT_OPTION_LABELS) {
      store.getState().addNode(rootId, 'TextLabel', props)
    }
    const ours = allPropertiesOf(
      documentToRbxmx(store.getState().document),
      'TextLabel',
    )
    const studio = allPropertiesOf(textOptionsReference, 'TextLabel')

    it('has the same seven labels', () => {
      expect(studio).toHaveLength(TEXT_OPTION_LABELS.length)
    })
    describe.each(TEXT_OPTION_LABELS.map(([name], i) => [name, i] as const))(
      '%s',
      (_name, i) => {
        it.each([...ours[i]])('%s', (prop, value) => {
          expect(studio[i].get(prop)).toBe(value)
        })
      },
    )
  })

  describe('matches the Studio reference file for image options', () => {
    const store = createDocumentStore()
    const rootId = store.getState().document.rootId
    for (const [, props] of IMAGE_OPTION_LABELS) {
      store.getState().addNode(rootId, 'ImageLabel', props)
    }
    const ours = allPropertiesOf(
      documentToRbxmx(store.getState().document),
      'ImageLabel',
    )
    const studio = allPropertiesOf(imageOptionsReference, 'ImageLabel')

    it('has the same six labels', () => {
      expect(studio).toHaveLength(IMAGE_OPTION_LABELS.length)
    })
    describe.each(IMAGE_OPTION_LABELS.map(([name], i) => [name, i] as const))(
      '%s',
      (_name, i) => {
        it.each([...ours[i]])('%s', (prop, value) => {
          expect(studio[i].get(prop)).toBe(value)
        })
      },
    )
  })

  describe.each(Object.entries(FONT_LABELS))(
    'matches the Studio reference file for a TextLabel in %s',
    (name, family) => {
      const store = createDocumentStore()
      const { addNode, renameNode } = store.getState()
      const id = addNode(store.getState().document.rootId, 'TextLabel', {
        FontFace: { family, weight: 'Regular' },
      })
      renameNode(id, name)
      const ours = propertiesOfNamed(
        documentToRbxmx(store.getState().document),
        name,
      )
      const studio = propertiesOfNamed(fontReference, name)

      it.each([...ours])('%s', (prop, value) => {
        expect(studio.get(prop)).toBe(value)
      })
    },
  )

  it('writes Bold as weight 700', () => {
    const store = createDocumentStore()
    store.getState().addNode(store.getState().document.rootId, 'TextLabel', {
      FontFace: { family: 'Roboto', weight: 'Bold' },
    })
    const label = propertiesOf(
      documentToRbxmx(store.getState().document),
      'TextLabel',
    )
    expect(label.get('FontFace')).toBe(
      'Font:<Family><url>rbxasset://fonts/families/Roboto.json</url></Family><Weight>700</Weight><Style>Normal</Style>',
    )
  })

  it('writes every weight by its number', () => {
    const store = createDocumentStore()
    store.getState().addNode(store.getState().document.rootId, 'TextLabel', {
      FontFace: { family: 'SourceSansPro', weight: 'SemiBold' },
    })
    const label = propertiesOf(
      documentToRbxmx(store.getState().document),
      'TextLabel',
    )
    // Not the default (Regular), so no CachedFaceId either.
    expect(label.get('FontFace')).toBe(
      'Font:<Family><url>rbxasset://fonts/families/SourceSansPro.json</url></Family><Weight>600</Weight><Style>Normal</Style>',
    )
  })

  it('writes italic, and the weight the font really has', () => {
    const store = createDocumentStore()
    store.getState().addNode(store.getState().document.rootId, 'TextLabel', {
      // Arimo has no Thin: Studio would only ever save Regular.
      FontFace: { family: 'Arial', weight: 'Thin', style: 'Italic' },
    })
    const label = propertiesOf(
      documentToRbxmx(store.getState().document),
      'TextLabel',
    )
    expect(label.get('FontFace')).toBe(
      'Font:<Family><url>rbxasset://fonts/families/Arial.json</url></Family><Weight>400</Weight><Style>Italic</Style>',
    )
  })

  it("writes UIStroke's ApplyStrokeMode as a number", () => {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const label = addNode(store.getState().document.rootId, 'TextLabel')
    addModifier(label, 'UIStroke')
    updateModifier(label, 'UIStroke', { ApplyStrokeMode: 'Border' })
    const stroke = propertiesOf(
      documentToRbxmx(store.getState().document),
      'UIStroke',
    )
    expect(stroke.get('ApplyStrokeMode')).toBe('token:1')
  })

  it('writes layout options as enum numbers', () => {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const frame = addNode(store.getState().document.rootId, 'Frame')
    addModifier(frame, 'UIListLayout')
    updateModifier(frame, 'UIListLayout', {
      FillDirection: 'Horizontal',
      HorizontalAlignment: 'Center',
      VerticalAlignment: 'Bottom',
      SortOrder: 'Name',
    })
    const list = propertiesOf(
      documentToRbxmx(store.getState().document),
      'UIListLayout',
    )
    expect(list.get('FillDirection')).toBe('token:0')
    expect(list.get('HorizontalAlignment')).toBe('token:0')
    expect(list.get('VerticalAlignment')).toBe('token:2')
    expect(list.get('SortOrder')).toBe('token:0')
  })

  it('writes gradient sequences as Studio does', () => {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const frame = addNode(store.getState().document.rootId, 'Frame')
    addModifier(frame, 'UIGradient')
    updateModifier(frame, 'UIGradient', {
      Color: [
        { time: 0, color: { r: 1, g: 0, b: 0 } },
        { time: 1, color: { r: 0, g: 0, b: 1 } },
      ],
      Rotation: 45,
    })
    const xml = documentToRbxmx(store.getState().document)
    expect(xml).toContain(
      '<ColorSequence name="Color">0 1 0 0 0 1 0 0 1 0 </ColorSequence>',
    )
    expect(propertiesOf(xml, 'UIGradient').get('Rotation')).toBe('float:45')
  })

  it('writes modifiers as children of their element, before its other children', () => {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const frame = addNode(store.getState().document.rootId, 'Frame')
    addNode(frame, 'TextLabel')
    addModifier(frame, 'UICorner')
    updateModifier(frame, 'UICorner', { CornerRadius: { s: 0.5, o: 0 } })

    const xml = documentToRbxmx(store.getState().document)
    const order = [...xml.matchAll(/<(\/?)Item(?: class="(\w+)")?/g)].map(
      ([, close, className]) => (close ? '/' : className),
    )
    expect(order).toEqual([
      'ScreenGui',
      'Frame',
      'UICorner',
      '/',
      'TextLabel',
      '/',
      '/',
      '/',
    ])
    expect(propertiesOf(xml, 'UICorner').get('TopLeftRadius')).toBe(
      'UDim:<S>0.5</S><O>0</O>',
    )
  })

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

  describe('matches the Studio reference file for sizing (build 51)', () => {
    // The file's first of each class is the "Defaults" label's.
    const store = createDocumentStore()
    const root = store.getState().document.rootId
    const label = store.getState().addNode(root, 'TextLabel')
    for (const modifier of [
      'UIScale',
      'UISizeConstraint',
      'UITextSizeConstraint',
    ] as const) {
      store.getState().addModifier(label, modifier)
    }
    const ours = documentToRbxmx(store.getState().document)

    describe.each(['UIScale', 'UISizeConstraint', 'UITextSizeConstraint'])(
      'a default %s',
      (className) => {
        const mine = propertiesOf(ours, className)
        const studio = propertiesOf(sizingReference, className)
        it.each([...mine])('%s', (name, value) => {
          expect(studio.get(name)).toBe(value)
        })
      },
    )

    it('writes no limit as INF, like Studio', () => {
      expect(propertiesOf(ours, 'UISizeConstraint').get('MaxSize')).toBe(
        'Vector2:<X>INF</X><Y>INF</Y>',
      )
    })

    it('writes AutomaticSize as Studio numbers it', () => {
      const s2 = createDocumentStore()
      s2.getState().addNode(s2.getState().document.rootId, 'TextLabel', {
        AutomaticSize: 'XY',
      })
      const xml = documentToRbxmx(s2.getState().document)
      expect(propertiesOf(xml, 'TextLabel').get('AutomaticSize')).toBe(
        propertiesOfNamed(sizingReference, 'AutomaticSizeXY').get(
          'AutomaticSize',
        ),
      )
    })
  })
})
