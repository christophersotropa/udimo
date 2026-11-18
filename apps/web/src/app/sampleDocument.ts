import { color3FromRgb } from '../lib/color.ts'
import type { UiDocument } from '../model/types.ts'
import { createDocumentStore } from '../store/documentStore.ts'

// A small starter layout so the canvas has something to show until you can
// add elements yourself (build 12). Plain placeholder shapes, no game art.
// It's built with a throwaway store, so it follows the same rules as any edit.
export function createSampleDocument(): UiDocument {
  const store = createDocumentStore()
  const { addNode, renameNode } = store.getState()
  const rootId = store.getState().document.rootId
  const white = color3FromRgb(255, 255, 255)
  renameNode(rootId, 'ShopGui') // also the downloaded file's name

  // Offset only: a fixed 260 x 60 pixel box, 24 pixels from the top-left corner.
  const coins = addNode(rootId, 'TextLabel', {
    Position: { xs: 0, xo: 24, ys: 0, yo: 24 },
    Size: { xs: 0, xo: 260, ys: 0, yo: 60 },
    BackgroundColor3: color3FromRgb(20, 20, 30),
    BackgroundTransparency: 0.4,
    Text: 'Coins: 120',
    TextColor3: color3FromRgb(255, 215, 80),
    TextSize: 28,
  })
  renameNode(coins, 'CoinCounter')

  // Scale: 40% x 50% of the screen, centered with AnchorPoint (0.5, 0.5).
  const shopWindow = addNode(rootId, 'Frame', {
    AnchorPoint: { x: 0.5, y: 0.5 },
    Position: { xs: 0.5, xo: 0, ys: 0.5, yo: 0 },
    Size: { xs: 0.4, xo: 0, ys: 0.5, yo: 0 },
    BackgroundColor3: color3FromRgb(35, 40, 60),
  })
  renameNode(shopWindow, 'Window')

  const title = addNode(shopWindow, 'TextLabel', {
    Size: { xs: 1, xo: 0, ys: 0, yo: 80 },
    BackgroundTransparency: 1,
    Text: 'Shop',
    TextColor3: white,
    TextSize: 40,
  })
  renameNode(title, 'Title')

  // Scale + Offset: pinned 24 pixels in from the window's bottom-right corner.
  const buy = addNode(shopWindow, 'TextLabel', {
    AnchorPoint: { x: 1, y: 1 },
    Position: { xs: 1, xo: -24, ys: 1, yo: -24 },
    Size: { xs: 0, xo: 200, ys: 0, yo: 64 },
    BackgroundColor3: color3FromRgb(60, 190, 100),
    Text: 'Buy',
    TextColor3: white,
    TextSize: 32,
  })
  renameNode(buy, 'BuyButton')

  return store.getState().document
}
