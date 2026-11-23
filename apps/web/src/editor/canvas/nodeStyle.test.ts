import { describe, expect, it } from 'vitest'
import type { Props } from '../../model/types.ts'
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

describe('nodeStyle with the newer properties', () => {
  function frame(props: Props) {
    const store = createDocumentStore()
    const id = store
      .getState()
      .addNode(store.getState().document.rootId, 'Frame', props)
    return store.getState().document.nodes[id]
  }

  it('turns a rotated element around its center, after the AnchorPoint shift', () => {
    const style = nodeStyle(frame({ Rotation: 15 }), NO_PIXELS)
    expect(style.transform).toMatch(/^translate\(.*\) rotate\(15deg\)$/)
  })

  it('draws a border outside the edges, with a UIStroke around it', () => {
    const store = createDocumentStore()
    const { addNode, addModifier } = store.getState()
    const id = addNode(store.getState().document.rootId, 'Frame', {
      BorderSizePixel: 3,
      BorderColor3: { r: 1, g: 0, b: 0 },
    })
    addModifier(id, 'UIStroke')
    const style = nodeStyle(store.getState().document.nodes[id], NO_PIXELS)
    expect(style.boxShadow).toBe(
      '0 0 0 3px rgb(255 0 0 / 1), 0 0 0 4px rgb(0 0 0 / 1)',
    )
  })
})

describe('sizing modifiers', () => {
  function withModifier(
    modifier: 'UIScale' | 'UISizeConstraint',
    props: Record<string, unknown>,
    nodeProps: Props = {},
  ) {
    const store = createDocumentStore()
    const { addNode, addModifier, updateModifier } = store.getState()
    const id = addNode(store.getState().document.rootId, 'Frame', nodeProps)
    addModifier(id, modifier)
    updateModifier(id, modifier, props as never)
    return store.getState().document.nodes[id]
  }

  it('limits the size with CSS min and max sizes', () => {
    const style = nodeStyle(
      withModifier('UISizeConstraint', {
        MinSize: { x: 50, y: 60 },
        MaxSize: { x: 400, y: null },
      }),
      NO_PIXELS,
    )
    expect(style).toMatchObject({ minWidth: 50, minHeight: 60, maxWidth: 400 })
    expect(style.maxHeight).toBeUndefined()
  })

  it('scales around the AnchorPoint', () => {
    // Anchor at the center: no shift needed, just the scale.
    const centered = nodeStyle(
      withModifier(
        'UIScale',
        { Scale: 2 },
        { AnchorPoint: { x: 0.5, y: 0.5 } },
      ),
      NO_PIXELS,
    )
    expect(centered.transform).toBe(
      'translate(-50%, -50%) translate(0%, 0%) scale(2)',
    )
    // Anchor at the top-left: shift so that corner stays put.
    // (0 − ½) × (1 − 2) = +½ of the element's size.
    const corner = nodeStyle(withModifier('UIScale', { Scale: 2 }), NO_PIXELS)
    expect(corner.transform).toBe(
      'translate(0%, 0%) translate(50%, 50%) scale(2)',
    )
  })

  it('leaves the transform alone at Scale 1', () => {
    const style = nodeStyle(withModifier('UIScale', { Scale: 1 }), NO_PIXELS)
    expect(style.transform).toBe('translate(0%, 0%)')
  })
})
