import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { countInstances, exportTree } from './instances.ts'

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
