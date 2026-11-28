import { createDocumentStore } from '../store/documentStore.ts'
import type { GraphNode, GraphNodeKind, LogicGraph } from './graph.ts'
import type { NodeId, UiDocument } from './types.ts'

// Shared test setup for the logic graph (not used by the app): a small shop
// UI, and a quick way to write a graph for it.

// ScreenGui > Shop (Frame) > BuyButton (TextButton), and a ShopWindow
// (Frame) after Shop.
export function shopDocument() {
  const store = createDocumentStore()
  const { addNode, renameNode } = store.getState()
  const rootId = store.getState().document.rootId
  const shop = addNode(rootId, 'Frame')
  renameNode(shop, 'Shop')
  const buy = addNode(shop, 'TextButton')
  renameNode(buy, 'BuyButton')
  const window = addNode(rootId, 'Frame')
  renameNode(window, 'ShopWindow')
  return { doc: store.getState().document, store, shop, buy, window }
}

// A graph from a list of [kind, element] pairs, each wired to the next
// (g1 → g2 → …), so a list reads like the chain it makes. Placed in a row.
export function chain(
  ...steps: [kind: GraphNodeKind, element: NodeId | null][]
): LogicGraph {
  const nodes: Record<string, GraphNode> = {}
  steps.forEach(([kind, element], i) => {
    const id = `g${i + 1}`
    nodes[id] = { id, kind, at: { x: i * 200, y: 0 }, element }
  })
  const wires = steps.slice(1).map((_, i) => ({
    id: `w${i + 1}`,
    from: `g${i + 1}`,
    to: `g${i + 2}`,
  }))
  return { nodes, wires }
}

// Several graphs side by side in one (their ids made distinct).
export function together(...graphs: LogicGraph[]): LogicGraph {
  const merged: LogicGraph = { nodes: {}, wires: [] }
  graphs.forEach((graph, n) => {
    const rename = (id: string) => `${id}_${n}`
    for (const node of Object.values(graph.nodes)) {
      merged.nodes[rename(node.id)] = { ...node, id: rename(node.id) }
    }
    for (const wire of graph.wires) {
      merged.wires.push({
        id: rename(wire.id),
        from: rename(wire.from),
        to: rename(wire.to),
      })
    }
  })
  return merged
}

export const withLogic = (doc: UiDocument, logic: LogicGraph): UiDocument => ({
  ...doc,
  logic,
})
