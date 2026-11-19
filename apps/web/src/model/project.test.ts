import { describe, expect, it } from 'vitest'
import { createSampleDocument } from '../app/sampleDocument.ts'
import { createDocumentStore } from '../store/documentStore.ts'
import {
  PROJECT_VERSION,
  ProjectFileError,
  parseProject,
  serializeProject,
} from './project.ts'

// The parsed shape of a project file, loosely typed so tests can break it.
type FileData = {
  format: string
  version: number
  document: {
    rootId: string
    nodes: Record<string, Record<string, unknown>>
  }
}

// ScreenGui > frame > label, as a project file.
function setup() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  const frame = addNode(rootId, 'Frame')
  const label = addNode(frame, 'TextLabel')
  return { doc: store.getState().document, rootId, frame, label }
}

// A valid project file, changed by `edit` to test one problem at a time.
function brokenFile(
  edit: (data: FileData, ids: ReturnType<typeof setup>) => void,
) {
  const ids = setup()
  const data = JSON.parse(serializeProject(ids.doc)) as FileData
  edit(data, ids)
  return JSON.stringify(data)
}

function expectRejected(text: string, message: string) {
  expect(() => parseProject(text)).toThrow(ProjectFileError)
  expect(() => parseProject(text)).toThrow(message)
}

describe('serializeProject and parseProject', () => {
  it('give back the same document', () => {
    const doc = createSampleDocument()
    expect(parseProject(serializeProject(doc))).toEqual(doc)
  })

  it('keep the locked flag', () => {
    const store = createDocumentStore()
    const { addNode, setLocked } = store.getState()
    const id = addNode(store.getState().document.rootId, 'Frame')
    setLocked(id, true)

    const doc = parseProject(serializeProject(store.getState().document))
    expect(doc.nodes[id].locked).toBe(true)
  })

  it('keep modifiers', () => {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const id = addNode(store.getState().document.rootId, 'Frame')
    addModifier(id, 'UICorner')
    addModifier(id, 'UIStroke')
    updateModifier(id, 'UIStroke', { Color: { r: 1, g: 0, b: 0 } })

    const doc = store.getState().document
    expect(parseProject(serializeProject(doc))).toEqual(doc)
  })

  it('keep italic, and open fonts saved before italic existed', () => {
    const store = createDocumentStore()
    const { addNode } = store.getState()
    const root = store.getState().document.rootId
    addNode(root, 'TextLabel', {
      FontFace: { family: 'Roboto', weight: 'Bold', style: 'Italic' },
    })
    addNode(root, 'TextLabel', {
      FontFace: { family: 'Roboto', weight: 'Bold' }, // no style
    })
    const doc = store.getState().document
    expect(parseProject(serializeProject(doc))).toEqual(doc)
  })

  it('label the file with its format and version', () => {
    const data = JSON.parse(serializeProject(setup().doc)) as FileData
    expect(data.format).toBe('udimo')
    expect(data.version).toBe(PROJECT_VERSION)
  })
})

describe('parseProject rejects', () => {
  it('text that is not JSON', () => {
    expectRejected('{ not json', 'not valid JSON')
  })

  it('JSON that is not a project', () => {
    expectRejected('{"name": "something else"}', 'not an Udimo project')
    expectRejected('[1, 2, 3]', 'not an Udimo project')
  })

  it('a file from a newer Udimo', () => {
    const text = brokenFile((data) => {
      data.version = PROJECT_VERSION + 1
    })
    expectRejected(text, 'newer version')
  })

  it('a root that is not a ScreenGui', () => {
    const text = brokenFile((data, { frame }) => {
      data.document.rootId = frame
    })
    expectRejected(text, 'ScreenGui')
  })

  it('a child that does not exist', () => {
    const text = brokenFile((data, { rootId }) => {
      data.document.nodes[rootId].children = ['missing']
    })
    expectRejected(text, 'tree is broken')
  })

  it('an element listed in two places', () => {
    const text = brokenFile((data, { rootId, label }) => {
      ;(data.document.nodes[rootId].children as string[]).push(label)
    })
    expectRejected(text, 'tree is broken')
  })

  it('an element outside the tree', () => {
    const text = brokenFile((data, { rootId }) => {
      data.document.nodes[rootId].children = []
    })
    expectRejected(text, 'outside the tree')
  })

  it('an unknown class', () => {
    const text = brokenFile((data, { frame }) => {
      data.document.nodes[frame].className = 'Part'
    })
    expectRejected(text, 'unknown class')
  })

  it('a property with the wrong kind of value', () => {
    const badColor = brokenFile((data, { frame }) => {
      data.document.nodes[frame].props = {
        BackgroundColor3: { r: 2, g: 0, b: 0 },
      }
    })
    expectRejected(badColor, 'invalid BackgroundColor3')

    const badSize = brokenFile((data, { frame }) => {
      data.document.nodes[frame].props = {
        Size: { xs: 0, xo: 'ten', ys: 0, yo: 0 },
      }
    })
    expectRejected(badSize, 'invalid Size')
  })

  it('a font weight Roblox does not have', () => {
    const text = brokenFile((data, { label }) => {
      data.document.nodes[label].props = {
        FontFace: { family: 'Roboto', weight: 'Chunky' },
      }
    })
    expectRejected(text, 'invalid FontFace')
  })

  it('a font style Roblox does not have', () => {
    const text = brokenFile((data, { label }) => {
      data.document.nodes[label].props = {
        FontFace: { family: 'Roboto', weight: 'Regular', style: 'Oblique' },
      }
    })
    expectRejected(text, 'invalid FontFace')
  })

  it('a font Udimo does not know', () => {
    const text = brokenFile((data, { label }) => {
      data.document.nodes[label].props = {
        FontFace: { family: 'ComicSans', weight: 'Regular' },
      }
    })
    expectRejected(text, 'invalid FontFace')
  })

  it('a modifier with the wrong kind of value', () => {
    const text = brokenFile((data, { frame }) => {
      data.document.nodes[frame].modifiers = {
        UIStroke: { Thickness: 'thick' },
      }
    })
    expectRejected(text, 'invalid UIStroke Thickness')
  })

  it('a gradient whose keypoint times are out of order', () => {
    const text = brokenFile((data, { frame }) => {
      data.document.nodes[frame].modifiers = {
        UIGradient: {
          Transparency: [
            { time: 0, value: 0 },
            { time: 0.8, value: 1 },
            { time: 0.2, value: 0 },
            { time: 1, value: 0 },
          ],
        },
      }
    })
    expectRejected(text, 'invalid UIGradient Transparency')
  })

  it('a layout option Roblox does not have', () => {
    const text = brokenFile((data, { frame }) => {
      data.document.nodes[frame].modifiers = {
        UIListLayout: { FillDirection: 'Diagonal' },
      }
    })
    expectRejected(text, 'invalid UIListLayout FillDirection')
  })

  it('modifiers on the ScreenGui', () => {
    const text = brokenFile((data, { rootId }) => {
      data.document.nodes[rootId].modifiers = { UICorner: {} }
    })
    expectRejected(text, 'can’t have modifiers')
  })

  it('an id that could break the nodes object', () => {
    // "__proto__" written as a JSON key is a normal key after JSON.parse,
    // which is exactly how it would sneak in.
    const text = brokenFile((data) => {
      data.document.nodes.EVIL = { id: '__proto__' }
    }).replace('"EVIL"', '"__proto__"')
    expectRejected(text, 'invalid element id')
  })
})

describe('parseProject skips', () => {
  it('modifiers it does not know', () => {
    const text = brokenFile((data, { frame }) => {
      data.document.nodes[frame].modifiers = { UIFlex: {}, UICorner: {} }
    })
    const frame = Object.values(parseProject(text).nodes).find(
      (n) => n.className === 'Frame',
    )!
    expect(frame.modifiers).toEqual({ UICorner: {} })
  })

  it('properties and fields it does not know', () => {
    const text = brokenFile((data, { frame }) => {
      data.document.nodes[frame].props = { Draggable: true, Visible: false }
      data.document.nodes[frame].comment = 'from the future'
    })
    const doc = parseProject(text)
    const frame = Object.values(doc.nodes).find((n) => n.className === 'Frame')!
    expect(frame.props).toEqual({ Visible: false })
    expect('comment' in frame).toBe(false)
  })
})
