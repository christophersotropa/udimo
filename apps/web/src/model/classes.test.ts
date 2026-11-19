import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { canEditTextOnCanvas } from './classes.ts'

describe('canEditTextOnCanvas', () => {
  it('is true for unlocked text elements only', () => {
    const store = createDocumentStore()
    const { addNode, setLocked } = store.getState()
    const root = store.getState().document.rootId
    const label = addNode(root, 'TextLabel')
    const box = addNode(root, 'TextBox')
    const frame = addNode(root, 'Frame')
    const locked = addNode(root, 'TextButton')
    setLocked(locked, true)
    const node = (id: string) => store.getState().document.nodes[id]

    expect(canEditTextOnCanvas(node(label))).toBe(true)
    expect(canEditTextOnCanvas(node(box))).toBe(true)
    expect(canEditTextOnCanvas(node(frame))).toBe(false)
    expect(canEditTextOnCanvas(node(locked))).toBe(false)
  })
})
