import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { documentToLuau } from './luau.ts'
import { documentForExport } from './options.ts'
import { documentToRbxmx } from './rbxmx.ts'

const SCREEN = { width: 1000, height: 500 }

// A pixel-sized Frame with a pixel-sized label inside.
function setup() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const frame = addNode(store.getState().document.rootId, 'Frame', {
    Position: { xs: 0, xo: 100, ys: 0, yo: 50 },
    Size: { xs: 0, xo: 500, ys: 0, yo: 250 },
  })
  const label = addNode(frame, 'TextLabel', {
    Size: { xs: 0, xo: 250, ys: 0, yo: 50 },
  })
  return { doc: store.getState().document, frame, label }
}

describe('documentForExport', () => {
  it('converts a copy to Scale, everything inside included', () => {
    const { doc, frame, label } = setup()
    const exported = documentForExport(doc, {
      convertToScale: true,
      screen: SCREEN,
    })
    expect(exported.nodes[frame].props.Size).toEqual({
      xs: 0.5,
      xo: 0,
      ys: 0.5,
      yo: 0,
    })
    expect(exported.nodes[label].props.Size).toEqual({
      xs: 0.5,
      xo: 0,
      ys: 0.2,
      yo: 0,
    })
  })

  it('never changes the design itself', () => {
    const { doc, frame } = setup()
    documentForExport(doc, { convertToScale: true, screen: SCREEN })
    expect(doc.nodes[frame].props.Size).toEqual({
      xs: 0,
      xo: 500,
      ys: 0,
      yo: 250,
    })
  })

  it('gives back the same document when the option is off', () => {
    const { doc } = setup()
    expect(
      documentForExport(doc, { convertToScale: false, screen: SCREEN }),
    ).toBe(doc)
  })
})

describe('ResetOnSpawn', () => {
  it("is Studio's true unless asked otherwise", () => {
    const { doc } = setup()
    expect(documentToRbxmx(doc)).toContain(
      '<bool name="ResetOnSpawn">true</bool>',
    )
    expect(documentToRbxmx(doc, { resetOnSpawn: false })).toContain(
      '<bool name="ResetOnSpawn">false</bool>',
    )
    expect(documentToLuau(doc, { resetOnSpawn: false })).toContain(
      'ResetOnSpawn = false,',
    )
  })

  it('is only set on the ScreenGui', () => {
    const { doc } = setup()
    expect(documentToRbxmx(doc).match(/ResetOnSpawn/g)).toHaveLength(1)
  })
})
