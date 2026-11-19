import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { extractSubtrees, pasteParent } from './fragment.ts'
import { parseProject, serializeProject } from './project.ts'

// ScreenGui > panel (Frame) > button, plus coins.
function setup() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  const panel = addNode(rootId, 'Frame')
  const button = addNode(panel, 'TextLabel')
  const coins = addNode(rootId, 'TextLabel')
  return { doc: store.getState().document, rootId, panel, button, coins }
}

describe('extractSubtrees', () => {
  it('copies the elements and everything inside them, in tree order', () => {
    const { doc, panel, button, coins } = setup()
    const fragment = extractSubtrees(doc, [coins, panel])
    expect(fragment.nodes[fragment.rootId].children).toEqual([panel, coins])
    expect(fragment.nodes[panel].children).toEqual([button])
    expect(fragment.nodes[panel].parentId).toBe(fragment.rootId)
  })

  it('skips a child selected together with its parent', () => {
    const { doc, panel, button } = setup()
    const fragment = extractSubtrees(doc, [button, panel])
    expect(fragment.nodes[fragment.rootId].children).toEqual([panel])
  })

  it('makes a complete, valid document', () => {
    const { doc, panel } = setup()
    const fragment = extractSubtrees(doc, [panel])
    // parseProject checks the whole tree and throws if anything is off.
    expect(parseProject(serializeProject(fragment))).toEqual(fragment)
  })
})

describe('pasteParent', () => {
  it('follows the Insert rules', () => {
    const { doc, rootId, panel, button, coins } = setup()
    const fragment = extractSubtrees(doc, [coins])
    expect(pasteParent(doc, [], fragment)).toBe(rootId)
    expect(pasteParent(doc, [panel], fragment)).toBe(panel)
    expect(pasteParent(doc, [button], fragment)).toBe(panel)
  })

  it('pastes beside a selected Frame that is itself the copy', () => {
    const { doc, rootId, panel } = setup()
    const fragment = extractSubtrees(doc, [panel])
    expect(pasteParent(doc, [panel], fragment)).toBe(rootId)
  })

  it('pastes beside a selected copy from the last paste', () => {
    const { doc, rootId, panel, coins } = setup()
    const fragment = extractSubtrees(doc, [coins])
    // Pretend panel was what the last paste made.
    expect(pasteParent(doc, [panel], fragment, [panel])).toBe(rootId)
  })
})
