import { describe, expect, it } from 'vitest'
import { createDocumentStore } from '../store/documentStore.ts'
import { absoluteBox } from './layout.ts'
import {
  pageLayoutAround,
  pagesHolding,
  pagesOf,
  shownPageOf,
} from './pages.ts'
import { SCREEN } from './screen.ts'

const FULL = { xs: 1, xo: 0, ys: 1, yo: 0 }

// ScreenGui > Book (UIPageLayout, 400 × 300) > three full-size pages,
// with a button on the second; plus a coin counter outside the book.
function setup() {
  const store = createDocumentStore()
  const { addNode, addModifier } = store.getState()
  const root = store.getState().document.rootId
  const book = addNode(root, 'Frame', {
    Size: { xs: 0, xo: 400, ys: 0, yo: 300 },
  })
  addModifier(book, 'UIPageLayout')
  const intro = addNode(book, 'Frame', { Size: FULL })
  const shop = addNode(book, 'Frame', { Size: FULL })
  const bag = addNode(book, 'Frame', { Size: FULL })
  const buy = addNode(shop, 'TextButton')
  const coins = addNode(root, 'TextLabel')
  const doc = () => store.getState().document
  return { store, doc, book, intro, shop, bag, buy, coins }
}

describe('pagesOf', () => {
  it('lists the pages in layout order, skipping hidden ones', () => {
    const { store, doc, book, intro, shop, bag } = setup()
    store.getState().updateProps(intro, { LayoutOrder: 5 })
    store.getState().updateProps(shop, { Visible: false })
    expect(pagesOf(doc(), book)).toEqual([bag, intro])
  })

  it('is empty for an element without a UIPageLayout', () => {
    const { doc, shop } = setup()
    expect(pagesOf(doc(), shop)).toEqual([])
  })
})

describe('shownPageOf and showPage', () => {
  it('starts on the first page, like a game', () => {
    const { doc, book, intro } = setup()
    expect(shownPageOf(doc(), book)).toBe(intro)
  })

  it('turns to a page, placing it where the first one was', () => {
    const { store, doc, book, intro, shop } = setup()
    store.getState().showPage(shop)
    expect(shownPageOf(doc(), book)).toBe(shop)
    expect(absoluteBox(doc(), shop, SCREEN)).toMatchObject({ x: 0, y: 0 })
    expect(absoluteBox(doc(), intro, SCREEN)).toMatchObject({ x: -400 })
  })

  it('is not an undo step', () => {
    const { store, doc, book, shop } = setup()
    const steps = store.getState().past.length
    store.getState().showPage(shop)
    expect(store.getState().past.length).toBe(steps)
    expect(doc().nodes[book].shownPage).toBe(shop)
  })

  it('does nothing for an element that isn’t a page', () => {
    const { store, doc, buy, coins } = setup()
    const before = doc()
    store.getState().showPage(buy)
    store.getState().showPage(coins)
    expect(doc()).toBe(before)
  })

  it('goes back to the first page if the shown one is deleted', () => {
    const { store, doc, book, intro, bag } = setup()
    store.getState().showPage(bag)
    store.getState().deleteNode(bag)
    expect(shownPageOf(doc(), book)).toBe(intro)
  })
})

describe('pagesHolding', () => {
  it('finds the page an element sits on, or the page itself', () => {
    const { doc, shop, buy } = setup()
    expect(pagesHolding(doc(), buy)).toEqual([shop])
    expect(pagesHolding(doc(), shop)).toEqual([shop])
  })

  it('finds every page of nested page layouts', () => {
    const { store, doc, shop } = setup()
    const { addNode, addModifier } = store.getState()
    addModifier(shop, 'UIPageLayout')
    addNode(shop, 'Frame')
    const tab = addNode(shop, 'Frame')
    expect(pagesHolding(doc(), tab)).toEqual([tab, shop])
  })

  it('is empty outside any page layout', () => {
    const { doc, book, coins } = setup()
    expect(pagesHolding(doc(), coins)).toEqual([])
    expect(pagesHolding(doc(), book)).toEqual([])
  })
})

describe('pageLayoutAround', () => {
  it('finds the page layout for the element, a page or anything on one', () => {
    const { doc, book, shop, buy } = setup()
    expect(pageLayoutAround(doc(), book)).toBe(book)
    expect(pageLayoutAround(doc(), shop)).toBe(book)
    expect(pageLayoutAround(doc(), buy)).toBe(book)
  })

  it('is null outside one, or with fewer than two pages', () => {
    const { store, doc, book, shop, bag, coins } = setup()
    expect(pageLayoutAround(doc(), coins)).toBeNull()
    store.getState().deleteNode(shop)
    store.getState().deleteNode(bag)
    expect(pageLayoutAround(doc(), book)).toBeNull()
  })
})
