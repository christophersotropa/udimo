import type { NodeId, UiDocument } from './types.ts'

// The logic graph: what the UI does when it's used, drawn as nodes and
// wires (like Unreal's Blueprints) and exported as a LocalScript (see
// export/logic.ts). Plain TypeScript, no React.
//
// "Node" already means an element of the UI here (UiNode), so the graph's
// boxes are called graph nodes. There are two roles:
// - an event starts a chain: "When BuyButton is pressed".
// - an action does something: "Show ShopWindow".
// A wire runs from one graph node to the action that happens next, so a
// chain reads left to right in the order things happen. Each graph node's
// settings (which element, for now) live inside it, not on wires.
//
// The graph is one way: Udimo turns it into code, never code back into a
// graph (a script can hold any Luau). It's saved in the project file, so
// it round-trips there.

export type GraphNodeId = string
export type WireId = string

// Every kind of graph node, with what the editor shows for it.
// `elements` says which elements it can be pointed at: buttons only, or
// any element (every element is a GuiObject, which has Visible and the
// mouse events).
export const GRAPH_NODE_KINDS = {
  Activated: {
    role: 'event',
    title: 'When pressed',
    hint: 'A button is clicked or tapped',
    elements: 'buttons',
  },
  MouseEnter: {
    role: 'event',
    title: 'When hovered',
    hint: 'The mouse moves onto an element',
    elements: 'any',
  },
  MouseLeave: {
    role: 'event',
    title: 'When hover ends',
    hint: 'The mouse moves off an element',
    elements: 'any',
  },
  Show: {
    role: 'action',
    title: 'Show',
    hint: 'Make an element visible',
    elements: 'any',
  },
  Hide: {
    role: 'action',
    title: 'Hide',
    hint: 'Make an element invisible',
    elements: 'any',
  },
  ToggleVisible: {
    role: 'action',
    title: 'Toggle visibility',
    hint: 'Show it if hidden, hide it if shown',
    elements: 'any',
  },
} as const satisfies Record<
  string,
  {
    role: 'event' | 'action'
    title: string
    hint: string
    elements: 'buttons' | 'any'
  }
>

export type GraphNodeKind = keyof typeof GRAPH_NODE_KINDS

export type GraphNode = {
  id: GraphNodeId
  kind: GraphNodeKind
  // Where it sits on the graph's canvas, in graph pixels.
  at: { x: number; y: number }
  // The element it listens to (an event) or changes (an action). null
  // until one is picked; a node without one is left out of the script.
  element: NodeId | null
}

// "After `from`, do `to`." `to` is always an action. A graph node has one
// way out, so at most one wire leaves it; many may arrive (two events can
// lead to the same action).
export type Wire = {
  id: WireId
  from: GraphNodeId
  to: GraphNodeId
}

export type LogicGraph = {
  nodes: Record<GraphNodeId, GraphNode>
  wires: Wire[]
}

export const isEvent = (node: GraphNode) =>
  GRAPH_NODE_KINDS[node.kind].role === 'event'

// The action that happens after `id`, if a wire leads on from it.
export function nextNode(graph: LogicGraph, id: GraphNodeId): GraphNode | null {
  const wire = graph.wires.find((w) => w.from === id)
  return wire ? (graph.nodes[wire.to] ?? null) : null
}

// The actions an event sets off, in order, following the wires. Stops if
// the wires loop back to a graph node already in the chain (the editor
// won't let you draw a loop, but a hand-edited file could).
export function chainFrom(
  graph: LogicGraph,
  eventId: GraphNodeId,
): GraphNode[] {
  const chain: GraphNode[] = []
  const seen = new Set<GraphNodeId>([eventId])
  for (
    let node = nextNode(graph, eventId);
    node && !seen.has(node.id);
    node = nextNode(graph, node.id)
  ) {
    seen.add(node.id)
    chain.push(node)
  }
  return chain
}

// True if `node` can point at element `id`: it exists, isn't the
// ScreenGui itself, and is a button if the node needs one.
export function canTarget(
  doc: UiDocument,
  node: GraphNode,
  id: NodeId | null,
): id is NodeId {
  const element = id === null ? undefined : doc.nodes[id]
  if (!element || element.parentId === null) return false
  if (GRAPH_NODE_KINDS[node.kind].elements === 'any') return true
  return (
    element.className === 'TextButton' || element.className === 'ImageButton'
  )
}
