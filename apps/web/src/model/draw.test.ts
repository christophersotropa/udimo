import { describe, expect, it } from 'vitest'
import { drawElement } from '../store/commands.ts'
import { createDocumentStore } from '../store/documentStore.ts'
import { containerAt, dragBox, planDraw } from './draw.ts'

const SCREEN = { width: 1000, height: 500 }
const at = (x: number, y: number) => ({ x, y })

// ScreenGui > panel (Frame at 100,100, 400×300, padding 10 left)
//   > inner (Frame at 20,20 in it, 100×100) and label (TextLabel at 200,20)
function setup() {
  const store = createDocumentStore()
  const { addNode, addModifier, updateModifier } = store.getState()
  const rootId = store.getState().document.rootId
  const panel = addNode(rootId, 'Frame', {
    Position: { xs: 0, xo: 100, ys: 0, yo: 100 },
    Size: { xs: 0, xo: 400, ys: 0, yo: 300 },
  })
  addModifier(panel, 'UIPadding')
  updateModifier(panel, 'UIPadding', { PaddingLeft: { s: 0, o: 10 } })
  const inner = addNode(panel, 'Frame', {
    Position: { xs: 0, xo: 20, ys: 0, yo: 20 },
  })
  const label = addNode(panel, 'TextLabel', {
    Position: { xs: 0, xo: 200, ys: 0, yo: 20 },
  })
  return {
    store,
    doc: () => store.getState().document,
    rootId,
    panel,
    inner,
    label,
  }
}

describe('containerAt', () => {
  it('finds the innermost Frame under a point, or the ScreenGui', () => {
    const { doc, rootId, panel, inner } = setup()
    expect(containerAt(doc(), at(50, 50), SCREEN)).toBe(rootId)
    expect(containerAt(doc(), at(450, 350), SCREEN)).toBe(panel)
    expect(containerAt(doc(), at(140, 130), SCREEN)).toBe(inner) // 100+10+20
  })

  it("doesn't draw into a TextLabel, but into the Frame it's in", () => {
    const { doc, panel } = setup()
    expect(containerAt(doc(), at(350, 130), SCREEN)).toBe(panel)
  })

  it('skips hidden and locked Frames', () => {
    const { store, doc, panel, inner } = setup()
    store.getState().updateProps(inner, { Visible: false })
    expect(containerAt(doc(), at(140, 130), SCREEN)).toBe(panel)
    store.getState().setLocked(panel, true)
    expect(containerAt(doc(), at(140, 130), SCREEN)).toBe(doc().rootId)
  })
})

describe('planDraw', () => {
  it('fills the drawn box, measured from the parent (inside its padding)', () => {
    const { doc, panel } = setup()
    const box = { x: 300, y: 200, width: 120.4, height: 60.6 }
    expect(planDraw(doc(), 'Frame', at(300, 200), box, SCREEN)).toEqual({
      parentId: panel,
      props: {
        // 300 - (100 + 10 padding), 200 - 100; sizes rounded to pixels
        Position: { xs: 0, xo: 190, ys: 0, yo: 100 },
        Size: { xs: 0, xo: 120, ys: 0, yo: 61 },
      },
    })
  })

  it('makes a default-size element for a click', () => {
    const { doc, rootId } = setup()
    const plan = planDraw(
      doc(),
      'TextLabel',
      at(20, 30),
      dragBox(at(20, 30), at(22, 31)),
      SCREEN,
    )
    expect(plan.parentId).toBe(rootId)
    expect(plan.props).toEqual({
      Position: { xs: 0, xo: 20, ys: 0, yo: 30 },
      Size: { xs: 0, xo: 200, ys: 0, yo: 50 }, // a TextLabel's default
    })
  })
})

describe('dragBox', () => {
  it('works whichever way you drag', () => {
    expect(dragBox(at(100, 100), at(40, 160))).toEqual({
      x: 40,
      y: 100,
      width: 60,
      height: 60,
    })
  })

  it('makes a square with Shift, as big as the larger side', () => {
    expect(dragBox(at(0, 0), at(30, 80), true)).toEqual({
      x: 0,
      y: 0,
      width: 80,
      height: 80,
    })
    expect(dragBox(at(100, 100), at(70, 90), true)).toEqual({
      x: 70,
      y: 70,
      width: 30,
      height: 30,
    })
  })
})

describe('drawElement', () => {
  it('adds the element, selects it, as one undo step', () => {
    const { store, doc, panel } = setup()
    const before = doc()
    const id = drawElement(
      store,
      'ImageLabel',
      at(300, 200),
      { x: 300, y: 200, width: 50, height: 50 },
      SCREEN,
    )
    expect(doc().nodes[id].parentId).toBe(panel)
    expect(store.getState().selection).toEqual([id])
    store.getState().undo()
    expect(doc()).toBe(before)
  })
})
