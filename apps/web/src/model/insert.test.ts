import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { insertParent, planInsert } from './insert.ts'

// ScreenGui > frame > label
function setup() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  const frame = addNode(rootId, 'Frame')
  const label = addNode(frame, 'TextLabel')
  return { store, doc: () => store.getState().document, rootId, frame, label }
}

describe('insertParent', () => {
  it('uses the ScreenGui when nothing is selected', () => {
    const { doc, rootId } = setup()
    expect(insertParent(doc(), [])).toBe(rootId)
  })

  it('goes inside a selected Frame', () => {
    const { doc, frame } = setup()
    expect(insertParent(doc(), [frame])).toBe(frame)
  })

  it('goes next to a selected TextLabel, not inside it', () => {
    const { doc, frame, label } = setup()
    expect(insertParent(doc(), [label])).toBe(frame)
  })

  it('uses the ScreenGui when several elements are selected', () => {
    const { doc, rootId, frame, label } = setup()
    expect(insertParent(doc(), [frame, label])).toBe(rootId)
  })
})

describe('planInsert', () => {
  it('centers a new Frame in its parent with its default size', () => {
    const { doc, rootId } = setup()
    expect(planInsert(doc(), [], 'Frame')).toEqual({
      parentId: rootId,
      props: {
        Size: { xs: 0, xo: 100, ys: 0, yo: 100 },
        Position: { xs: 0.5, xo: -50, ys: 0.5, yo: -50 },
      },
    })
  })

  it('uses the TextLabel default size (200 x 50)', () => {
    const { doc } = setup()
    const { props } = planInsert(doc(), [], 'TextLabel')
    expect(props.Position).toEqual({ xs: 0.5, xo: -100, ys: 0.5, yo: -25 })
  })

  it('shifts each repeated insert so they do not stack exactly', () => {
    const { store, doc, rootId } = setup()
    const { addNode } = store.getState()

    const first = planInsert(doc(), [], 'Frame')
    addNode(first.parentId, 'Frame', first.props)
    const second = planInsert(doc(), [], 'Frame')
    addNode(second.parentId, 'Frame', second.props)
    const third = planInsert(doc(), [], 'Frame')

    expect(second.parentId).toBe(rootId)
    expect(second.props.Position).toEqual({
      xs: 0.5,
      xo: -30,
      ys: 0.5,
      yo: -30,
    })
    expect(third.props.Position).toEqual({ xs: 0.5, xo: -10, ys: 0.5, yo: -10 })
  })
})
