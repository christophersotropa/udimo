import { describe, expect, it } from 'vitest'
// Real files saved from Roblox Studio (see export/rbxmx.test.ts for what
// each holds). "?raw" makes Vite load them as text.
import canvasGroup from '../../../../docs/reference/canvas-group.rbxmx?raw'
import cornerStroke from '../../../../docs/reference/corner-stroke.rbxmx?raw'
import defaults from '../../../../docs/reference/defaults.rbxmx?raw'
import fonts from '../../../../docs/reference/fonts.rbxmx?raw'
import gradientPaddingAspect from '../../../../docs/reference/gradient-padding-aspect.rbxmx?raw'
import imageClasses from '../../../../docs/reference/image-classes.rbxmx?raw'
import imageOptions from '../../../../docs/reference/image-options.rbxmx?raw'
import listGridLayouts from '../../../../docs/reference/list-grid-layouts.rbxmx?raw'
import scrolling from '../../../../docs/reference/scrolling.rbxmx?raw'
import sizing from '../../../../docs/reference/sizing.rbxmx?raw'
import textClasses from '../../../../docs/reference/text-classes.rbxmx?raw'
import textOptions from '../../../../docs/reference/text-options.rbxmx?raw'
import uiPageLayout from '../../../../docs/reference/ui-page-layout.rbxmx?raw'
import { createPetInventoryDocument } from '../app/petInventory.ts'
import { createSampleDocument } from '../app/sampleDocument.ts'
import { documentToRbxmx } from '../export/rbxmx.ts'
import { allPropertiesOf } from '../export/testRbxmx.ts'
import { resolveProps } from '../model/defaults.ts'
import { MODIFIER_CLASSES, resolveModifier } from '../model/modifiers.ts'
import type { NodeId, UiDocument } from '../model/types.ts'
import { importRbxmx, RbxmxError } from './toDocument.ts'

const STUDIO_FILES = {
  'canvas-group': canvasGroup,
  'corner-stroke': cornerStroke,
  defaults,
  fonts,
  'gradient-padding-aspect': gradientPaddingAspect,
  'image-classes': imageClasses,
  'image-options': imageOptions,
  'list-grid-layouts': listGridLayouts,
  scrolling,
  sizing,
  'text-classes': textClasses,
  'text-options': textOptions,
  'ui-page-layout': uiPageLayout,
}

// The classes that appear in a file, each once.
const classesIn = (xml: string) => [
  ...new Set([...xml.matchAll(/<Item class="(\w+)"/g)].map((m) => m[1])),
]

describe('importing Studio’s own files', () => {
  // The strongest check there is: import a file Studio saved, export it
  // again, and every property Udimo writes must match what Studio wrote,
  // value for value, for every instance in the file.
  describe.each(Object.entries(STUDIO_FILES))('%s.rbxmx', (_, studio) => {
    const result = importRbxmx(studio)
    const ours = documentToRbxmx(result.document)

    it('skips nothing and has nothing to report', () => {
      expect(result.skipped).toEqual([])
      expect(result.notes).toEqual([])
      expect(result.wrapped).toBe(false)
    })

    it.each(classesIn(studio))('round-trips every %s', (className) => {
      const theirs = allPropertiesOf(studio, className)
      const mine = allPropertiesOf(ours, className)
      expect(mine).toHaveLength(theirs.length)
      mine.forEach((properties, i) => {
        for (const [name, value] of properties) {
          expect(theirs[i].get(name), `${className} #${i + 1}: ${name}`).toBe(
            value,
          )
        }
      })
    })
  })
})

// A document as plain data, to compare two by what they mean: without
// their random ids, and with every default filled in (the importer keeps
// only values that differ from Roblox's defaults, so a document that sets
// a default by hand comes back without it, meaning the same thing).
function shape(doc: UiDocument, id: NodeId = doc.rootId): unknown {
  const node = doc.nodes[id]
  return {
    className: node.className,
    name: node.name,
    props: resolveProps(node),
    modifiers: MODIFIER_CLASSES.map((m) => resolveModifier(node, m)),
    children: node.children.map((child) => shape(doc, child)),
  }
}

describe('importing Udimo’s own exports', () => {
  it.each([
    ['the Shop example', createSampleDocument],
    ['the Pet Inventory example', createPetInventoryDocument],
  ])('gets %s back exactly', (_, make) => {
    const doc = make()
    const back = importRbxmx(documentToRbxmx(doc))
    expect(shape(back.document)).toEqual(shape(doc))
    expect(back.notes).toEqual([])
  })
})

// A small .rbxmx file: items written as [class, properties xml, children].
type Item = [className: string, properties: string, children?: Item[]]
const item = ([className, properties, children = []]: Item): string =>
  `<Item class="${className}" referent="RBX${className}"><Properties>${properties}</Properties>${children.map(item).join('')}</Item>`
const file = (...items: Item[]) =>
  `<roblox version="4">${items.map(item).join('')}</roblox>`
const named = (name: string) => `<string name="Name">${name}</string>`

describe('importRbxmx', () => {
  it('opens a ScreenGui with its elements and modifiers', () => {
    const { document, imported } = importRbxmx(
      file([
        'ScreenGui',
        named('Shop'),
        [
          [
            'Frame',
            named('Window'),
            [
              [
                'UICorner',
                '<UDim name="TopLeftRadius"><S>0</S><O>12</O></UDim>',
              ],
              [
                'TextLabel',
                `${named('Title')}<string name="Text">Shop</string>`,
              ],
            ],
          ],
        ],
      ]),
    )
    const root = document.nodes[document.rootId]
    expect(root.name).toBe('Shop')
    const window = document.nodes[root.children[0]]
    expect(window.name).toBe('Window')
    expect(window.modifiers).toEqual({
      UICorner: { CornerRadius: { s: 0, o: 12 } },
    })
    expect(document.nodes[window.children[0]].props.Text).toBe('Shop')
    expect(imported).toBe(4) // ScreenGui, Frame, UICorner, TextLabel
  })

  it('leaves out classes Udimo doesn’t have, and says where they were', () => {
    const { skipped, document } = importRbxmx(
      file([
        'ScreenGui',
        named('Shop'),
        [
          [
            'Frame',
            named('Window'),
            [
              [
                'LocalScript',
                named('Handler'),
                [['ModuleScript', named('Util')]],
              ],
            ],
          ],
        ],
      ]),
    )
    expect(skipped).toEqual([
      {
        className: 'LocalScript',
        name: 'Handler',
        path: 'Shop.Window',
        inside: 1,
      },
    ])
    const window = document.nodes[document.nodes[document.rootId].children[0]]
    expect(window.children).toEqual([])
  })

  it('wraps elements saved without a ScreenGui in a new one', () => {
    const { document, wrapped } = importRbxmx(
      file(['Frame', named('Card')], ['TextButton', named('Buy')]),
    )
    expect(wrapped).toBe(true)
    const root = document.nodes[document.rootId]
    expect(root.className).toBe('ScreenGui')
    expect(root.children.map((id) => document.nodes[id].name)).toEqual([
      'Card',
      'Buy',
    ])
  })

  it('reads enums, colours (both ways Roblox writes them) and fonts', () => {
    const { document } = importRbxmx(
      file([
        'TextLabel',
        named('Title') +
          '<token name="TextXAlignment">0</token>' +
          '<Color3 name="TextColor3"><R>1</R><G>0</G><B>0</B></Color3>' +
          '<Color3uint8 name="BackgroundColor3">4278255360</Color3uint8>' +
          '<Font name="FontFace"><Family><url>rbxasset://fonts/families/FredokaOne.json</url></Family><Weight>400</Weight><Style>Italic</Style></Font>',
      ]),
    )
    const label = document.nodes[document.nodes[document.rootId].children[0]]
    expect(label.props).toEqual({
      TextXAlignment: 'Left',
      TextColor3: { r: 1, g: 0, b: 0 },
      BackgroundColor3: { r: 0, g: 1, b: 0 }, // 0xFF00FF00: green
      FontFace: { family: 'FredokaOne', weight: 'Regular', style: 'Italic' },
    })
  })

  it('keeps only what differs from Studio’s defaults', () => {
    const { document } = importRbxmx(
      file([
        'Frame',
        named('Frame') +
          '<bool name="Visible">true</bool>' +
          '<float name="BackgroundTransparency">0.5</float>',
      ]),
    )
    const frame = document.nodes[document.nodes[document.rootId].children[0]]
    expect(frame.props).toEqual({ BackgroundTransparency: 0.5 })
  })

  it('notes values Udimo can’t use, and leaves them at the default', () => {
    const { document, notes } = importRbxmx(
      file([
        'TextLabel',
        named('Title') +
          '<float name="LineHeight">5</float>' +
          '<float name="TextSize">big</float>' +
          '<Font name="FontFace"><Family><url>rbxasset://fonts/families/Gotham.json</url></Family><Weight>400</Weight><Style>Normal</Style></Font>',
      ]),
    )
    const label = document.nodes[document.nodes[document.rootId].children[0]]
    expect(label.props).toEqual({})
    expect(notes).toEqual([
      'TextLabel Title: LineHeight has a value Udimo can’t use, so it was left at its default.',
      'TextLabel Title: TextSize couldn’t be read, so it was left at its default.',
      'TextLabel Title: the font Gotham isn’t in Udimo yet, so it uses Source Sans Pro.',
    ])
  })

  it('notes corners with different radii, using the top-left one', () => {
    const { document, notes } = importRbxmx(
      file([
        'Frame',
        named('Card'),
        [
          [
            'UICorner',
            '<UDim name="TopLeftRadius"><S>0</S><O>10</O></UDim>' +
              '<UDim name="BottomRightRadius"><S>0</S><O>20</O></UDim>',
          ],
        ],
      ]),
    )
    const card = document.nodes[document.nodes[document.rootId].children[0]]
    expect(card.modifiers?.UICorner).toEqual({ CornerRadius: { s: 0, o: 10 } })
    expect(notes[0]).toContain('different radii')
  })

  it('keeps one of each modifier and one layout', () => {
    const { document, notes, skipped } = importRbxmx(
      file([
        'Frame',
        named('List'),
        [
          ['UIListLayout', ''],
          ['UIGridLayout', ''],
          ['UIStroke', ''],
          ['UIStroke', ''],
        ],
      ]),
    )
    const list = document.nodes[document.nodes[document.rootId].children[0]]
    expect(Object.keys(list.modifiers!)).toEqual(['UIListLayout', 'UIStroke'])
    expect(notes).toEqual([
      'List has both UIListLayout and UIGridLayout; Udimo keeps UIListLayout.',
      'List has more than one UIStroke; Udimo keeps the first.',
    ])
    expect(skipped.map((s) => s.className)).toEqual([
      'UIGridLayout',
      'UIStroke',
    ])
  })

  it('leaves out modifiers placed straight on the ScreenGui', () => {
    const { skipped } = importRbxmx(
      file(['ScreenGui', named('Shop'), [['UICorner', '']]]),
    )
    expect(skipped.map((s) => s.className)).toEqual(['UICorner'])
  })

  it.each([
    ['<roblox!\u0089ÿ binary', 'binary model (.rbxm)'],
    ['<html></html>', 'isn’t a Roblox model file'],
    ['not a file', 'isn’t a readable .rbxmx file'],
    [file(['Folder', named('Stuff')]), 'There’s no GUI in this file'],
  ])('refuses %s', (text, message) => {
    expect(() => importRbxmx(text)).toThrow(RbxmxError)
    expect(() => importRbxmx(text)).toThrow(message)
  })

  it('reports paths from the file’s own top element when it has no ScreenGui', () => {
    const { skipped } = importRbxmx(
      file(['Frame', named('Card'), [['LocalScript', named('Hover')]]]),
    )
    expect(skipped[0].path).toBe('Card')
  })
})
