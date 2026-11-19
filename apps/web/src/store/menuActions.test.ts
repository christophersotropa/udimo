import { beforeEach, describe, expect, it } from 'vitest'
import { CATALOG } from '../model/catalog.ts'
import {
  clearClipboard,
  copyToClipboard,
  pasteFromClipboard,
} from './clipboard.ts'
import { insertObject, setLockedAll, setVisible } from './commands.ts'
import { createDocumentStore } from './documentStore.ts'

const entry = (className: string) =>
  CATALOG.find((e) => e.className === className)!

// ScreenGui > panel (Frame) > label (TextLabel)
function setup() {
  const store = createDocumentStore()
  const { addNode } = store.getState()
  const rootId = store.getState().document.rootId
  const panel = addNode(rootId, 'Frame')
  const label = addNode(panel, 'TextLabel')
  const doc = () => store.getState().document
  const selected = () => store.getState().selection
  return { store, doc, selected, rootId, panel, label }
}

describe('insertObject', () => {
  it('puts an element inside a container, and selects it', () => {
    const { store, doc, selected, panel } = setup()
    expect(insertObject(store, panel, entry('TextButton'))).toBe(true)
    const [added] = selected()
    expect(doc().nodes[added].className).toBe('TextButton')
    expect(doc().nodes[added].parentId).toBe(panel)
  })

  it('puts an element next to a non-container', () => {
    const { store, doc, selected, panel, label } = setup()
    insertObject(store, label, entry('ImageLabel'))
    expect(doc().nodes[selected()[0]].parentId).toBe(panel)
  })

  it('puts an element in the ScreenGui for empty canvas', () => {
    const { store, doc, selected, rootId } = setup()
    insertObject(store, rootId, entry('Frame'))
    expect(doc().nodes[selected()[0]].parentId).toBe(rootId)
  })

  it('adds a modifier to the target itself, once', () => {
    const { store, doc, label } = setup()
    expect(insertObject(store, label, entry('UICorner'))).toBe(true)
    expect(doc().nodes[label].modifiers?.UICorner).toEqual({})
    expect(insertObject(store, label, entry('UICorner'))).toBe(false)
  })

  it('refuses modifiers on the ScreenGui', () => {
    const { store, rootId } = setup()
    expect(insertObject(store, rootId, entry('UIStroke'))).toBe(false)
  })
})

describe('hiding and locking several elements', () => {
  it('hides and shows them together, as one undo step', () => {
    const { store, doc, panel, label } = setup()
    const before = doc()
    setVisible(store, [panel, label], false)
    expect(doc().nodes[panel].props.Visible).toBe(false)
    expect(doc().nodes[label].props.Visible).toBe(false)
    store.getState().undo()
    expect(doc()).toBe(before)

    setVisible(store, [panel, label], false)
    setVisible(store, [panel, label], true)
    expect('Visible' in doc().nodes[panel].props).toBe(false)
  })

  it('locks them together', () => {
    const { store, doc, panel, label } = setup()
    setLockedAll(store, [panel, label], true)
    expect(doc().nodes[panel].locked && doc().nodes[label].locked).toBe(true)
  })
})

describe('the clipboard', () => {
  beforeEach(clearClipboard)

  it('has nothing to paste at first, and copies nothing without a selection', () => {
    const { store } = setup()
    expect(pasteFromClipboard(store)).toBe(false)
    expect(copyToClipboard(store)).toBe(false)
  })

  it('pastes into the given element with Paste Into', () => {
    const { store, doc, selected, rootId, panel, label } = setup()
    const other = store.getState().addNode(rootId, 'Frame')
    store.getState().select(label)
    copyToClipboard(store)
    expect(pasteFromClipboard(store, other)).toBe(true)
    expect(doc().nodes[selected()[0]].parentId).toBe(other)
    expect(doc().nodes[panel].children).toEqual([label]) // original untouched
  })

  it('cuts', () => {
    const { store, doc, label } = setup()
    store.getState().select(label)
    copyToClipboard(store, true)
    expect(doc().nodes[label]).toBeUndefined()
  })
})
