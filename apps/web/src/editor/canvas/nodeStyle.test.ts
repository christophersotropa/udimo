import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../../store/documentStore.ts'
import { nodeStyle } from './nodeStyle.ts'

const NO_PIXELS = { cornerRadius: 0, aspectSize: null, slot: null }

// A node with a default black UIStroke.
function strokedNode(className: 'Frame' | 'TextButton', border = false) {
  const store = createDocumentStore()
  const { addNode, addModifier, updateModifier } = store.getState()
  const id = addNode(store.getState().document.rootId, className)
  addModifier(id, 'UIStroke')
  if (border) updateModifier(id, 'UIStroke', { ApplyStrokeMode: 'Border' })
  return store.getState().document.nodes[id]
}

describe('nodeStyle with a UIStroke', () => {
  it('outlines the box of a Frame', () => {
    const style = nodeStyle(strokedNode('Frame'), NO_PIXELS)
    expect(style.boxShadow).toBe('0 0 0 1px rgb(0 0 0 / 1)')
  })

  it('outlines the text of a text element (Contextual)', () => {
    const style = nodeStyle(strokedNode('TextButton'), NO_PIXELS)
    expect(style.boxShadow).toBeUndefined()
    expect(style.WebkitTextStroke).toBe('2px rgb(0 0 0 / 1)')
  })

  it('outlines the box of a text element in Border mode', () => {
    const style = nodeStyle(strokedNode('TextButton', true), NO_PIXELS)
    expect(style.boxShadow).toBe('0 0 0 1px rgb(0 0 0 / 1)')
    expect(style.WebkitTextStroke).toBeUndefined()
  })
})
