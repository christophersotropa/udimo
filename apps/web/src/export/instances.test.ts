import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { chain, shopDocument, withLogic } from '../model/testGraphs.ts'
import type { UiDocument } from '../model/types.ts'
import { countInstances, exportTree } from './instances.ts'
import { documentToLuau } from './luau.ts'
import { documentToRbxmx } from './rbxmx.ts'

describe('countInstances', () => {
  it('counts the ScreenGui, elements, modifiers and the script, like Studio', () => {
    const store = createDocumentStore()
    const { addNode, addModifier } = store.getState()
    const root = store.getState().document.rootId
    const frame = addNode(root, 'Frame')
    addModifier(frame, 'UICorner')
    addModifier(frame, 'UIStroke')
    addNode(frame, 'TextButton')
    const doc = store.getState().document

    // ScreenGui + Frame + UICorner + UIStroke + TextButton.
    expect(countInstances(exportTree(doc))).toBe(5)
    // The button stubs add a LocalScript.
    expect(countInstances(exportTree(doc, { buttonScript: true }))).toBe(6)
  })

  it('counts an empty ScreenGui as one instance', () => {
    const doc = createDocumentStore().getState().document
    expect(countInstances(exportTree(doc))).toBe(1)
  })
})

describe('the logic graph’s LocalScript', () => {
  // The shop with "pressed → show the window".
  function shop() {
    const { doc, buy, window } = shopDocument()
    return withLogic(doc, chain(['Activated', buy], ['Show', window]))
  }
  const scriptsIn = (doc: UiDocument, buttonScript = false) =>
    exportTree(doc, { buttonScript })
      .children.filter((child) => child.className === 'LocalScript')
      .map((child) => child.properties.find((p) => p.name === 'Name')?.value)

  it('ships in the ScreenGui when the graph does something', () => {
    expect(scriptsIn(shop())).toEqual([{ type: 'string', value: 'Logic' }])
    expect(scriptsIn(shopDocument().doc)).toEqual([])
  })

  it('sits beside the button stubs when both are on', () => {
    expect(scriptsIn(shop(), true)).toEqual([
      { type: 'string', value: 'Logic' },
      { type: 'string', value: 'ButtonHandlers' },
    ])
  })

  it('is written into both exports', () => {
    const doc = shop()
    expect(documentToRbxmx(doc)).toContain('shopWindow.Visible = true')
    // The builder script sets its Source as a Luau string.
    expect(documentToLuau(doc)).toContain('shopWindow.Visible = true')
  })
})
