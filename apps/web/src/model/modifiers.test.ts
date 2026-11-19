import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { cornerRadiusPixels } from './layout.ts'
import { resolveModifier } from './modifiers.ts'

const SCREEN = { width: 1000, height: 500 }

// A 200 × 80 Frame.
function setup() {
  const store = createDocumentStore()
  const id = store
    .getState()
    .addNode(store.getState().document.rootId, 'Frame', {
      Size: { xs: 0, xo: 200, ys: 0, yo: 80 },
    })
  const doc = () => store.getState().document
  return { store, id, doc }
}

describe('resolveModifier', () => {
  it('is null for a modifier the element does not have', () => {
    const { doc, id } = setup()
    expect(resolveModifier(doc().nodes[id], 'UICorner')).toBeNull()
  })

  it("fills in Studio's defaults", () => {
    const { store, doc, id } = setup()
    store.getState().addModifier(id, 'UIStroke')
    store.getState().updateModifier(id, 'UIStroke', { Thickness: 3 })
    expect(resolveModifier(doc().nodes[id], 'UIStroke')).toEqual({
      Color: { r: 0, g: 0, b: 0 },
      Thickness: 3,
      Transparency: 0,
    })
  })
})

describe('cornerRadiusPixels', () => {
  it('is 0 without a UICorner, and 8px with the default one', () => {
    const { store, doc, id } = setup()
    expect(cornerRadiusPixels(doc(), id, SCREEN)).toBe(0)
    store.getState().addModifier(id, 'UICorner')
    expect(cornerRadiusPixels(doc(), id, SCREEN)).toBe(8)
  })

  it('measures Scale against the shorter side, never past half of it', () => {
    const { store, doc, id } = setup()
    store.getState().addModifier(id, 'UICorner')
    store
      .getState()
      .updateModifier(id, 'UICorner', { CornerRadius: { s: 0.25, o: 0 } })
    expect(cornerRadiusPixels(doc(), id, SCREEN)).toBe(20) // 0.25 × 80

    store
      .getState()
      .updateModifier(id, 'UICorner', { CornerRadius: { s: 1, o: 0 } })
    expect(cornerRadiusPixels(doc(), id, SCREEN)).toBe(40) // a pill: half of 80
  })
})
