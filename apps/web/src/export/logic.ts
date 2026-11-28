import {
  canTarget,
  chainFrom,
  GRAPH_NODE_KINDS,
  type GraphNode,
  type GraphNodeKind,
  isEvent,
} from '../model/graph.ts'
import type { NodeId, UiDocument } from '../model/types.ts'
import { AMBIGUOUS_NOTE, elementPath, luauIdentifier } from './scripts.ts'

// Compiles the logic graph (model/graph.ts) into the Luau of a LocalScript
// that sits in the ScreenGui. A LocalScript, because button presses and
// the mouse happen on the player's device. The code is meant to be read:
// one variable per element it uses, then one handler per event, each
// with a comment saying when it runs.

export const LOGIC_SCRIPT_NAME = 'Logic'

// Each event's Roblox signal, and how its comment reads.
const EVENTS: Partial<
  Record<GraphNodeKind, { signal: string; when: (name: string) => string }>
> = {
  Activated: { signal: 'Activated', when: (name) => `${name} is pressed` },
  MouseEnter: {
    signal: 'MouseEnter',
    when: (name) => `the mouse moves onto ${name}`,
  },
  MouseLeave: {
    signal: 'MouseLeave',
    when: (name) => `the mouse moves off ${name}`,
  },
}

// Each action's line of Luau, given its element's variable.
const ACTIONS: Partial<Record<GraphNodeKind, (v: string) => string>> = {
  Show: (v) => `${v}.Visible = true`,
  Hide: (v) => `${v}.Visible = false`,
  ToggleVisible: (v) => `${v}.Visible = not ${v}.Visible`,
}

// Every element's place in Explorer order (top to bottom), so the script
// lists things in the order you'd find them.
function treeOrder(doc: UiDocument): Map<NodeId, number> {
  const order = new Map<NodeId, number>()
  const visit = (id: NodeId) => {
    order.set(id, order.size)
    for (const childId of doc.nodes[id].children) visit(childId)
  }
  visit(doc.rootId)
  return order
}

// The LocalScript's source, or null if the graph makes no handler (no
// graph, or no event with an element and at least one action after it).
// Graph nodes without a usable element are left out.
export function logicScriptSource(doc: UiDocument): string | null {
  const graph = doc.logic
  if (!graph) return null
  const order = treeOrder(doc)
  const kindOrder = Object.keys(GRAPH_NODE_KINDS)

  // Each handler: its event and the actions that will be written.
  const handlers = Object.values(graph.nodes)
    .filter((node) => isEvent(node) && canTarget(doc, node, node.element))
    .map((event) => ({
      event,
      actions: chainFrom(graph, event.id).filter(
        (action) =>
          ACTIONS[action.kind] && canTarget(doc, action, action.element),
      ),
    }))
    .filter((handler) => handler.actions.length > 0)
    // Explorer order, then the order events are listed in.
    .sort(
      (a, b) =>
        order.get(a.event.element!)! - order.get(b.event.element!)! ||
        kindOrder.indexOf(a.event.kind) - kindOrder.indexOf(b.event.kind),
    )
  if (handlers.length === 0) return null

  // A variable for every element used, in Explorer order.
  const elements = new Set<NodeId>()
  for (const { event, actions } of handlers) {
    elements.add(event.element!)
    for (const action of actions) elements.add(action.element!)
  }
  const used = new Set(['gui', 'script', 'game'])
  const variables = new Map<NodeId, string>()
  const lines = [
    "-- Made with Udimo from this ScreenGui's logic graph. To change what it",
    '-- does, edit the graph in Udimo and export again: changes made here are',
    '-- replaced by the next export.',
    '',
    'local gui = script.Parent',
    '',
  ]
  for (const id of [...elements].sort(
    (a, b) => order.get(a)! - order.get(b)!,
  )) {
    const variable = luauIdentifier(doc.nodes[id].name, used, 'element')
    variables.set(id, variable)
    const { path, ambiguous } = elementPath(doc, id)
    if (ambiguous) lines.push(...AMBIGUOUS_NOTE)
    lines.push(`local ${variable} = ${path}`)
  }

  const variableOf = (node: GraphNode) => variables.get(node.element!)!
  for (const { event, actions } of handlers) {
    const { signal, when } = EVENTS[event.kind]!
    const name = doc.nodes[event.element!].name.replace(/\n/g, ' ')
    lines.push(
      '',
      `-- When ${when(name)}`,
      `${variableOf(event)}.${signal}:Connect(function()`,
      ...actions.map(
        (action) => `\t${ACTIONS[action.kind]!(variableOf(action))}`,
      ),
      'end)',
    )
  }
  return lines.join('\n') + '\n'
}
