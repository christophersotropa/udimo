import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type EdgeChangeset,
  type FinalConnectionState,
  type NodeChangeset,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  canConnect,
  type GraphNodeId,
  type GraphNodeKind,
  type LogicGraph,
} from '../../model/graph.ts'
import type { NodeId, UiNode } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { PlusIcon } from '../panels/icons.tsx'
import { Button } from '../ui/Button.tsx'
import { AddNodeMenu } from './AddNodeMenu.tsx'
import { type GraphFlowNode, GraphNodeView } from './GraphNodeView.tsx'

// The Logic side of the editor: the logic graph (model/graph.ts), drawn
// and edited with React Flow (@xyflow/react), a library for node editors
// that handles panning, zooming, dragging and drawing wires.
//
// The document store owns the graph, so undo, autosave and export all
// see it. React Flow gets a copy shaped its way (GraphFlowNode, Edge),
// plus a few things only it cares about: which graph nodes are selected
// and how big each one measured. Edits go back to the store.

const NODE_TYPES = { graph: GraphNodeView }
const EMPTY_GRAPH: LogicGraph = { nodes: {}, wires: [] }

// Where you'd panned and zoomed to, kept while you're on the Design side
// so coming back finds the graph as you left it. (null: fit it to view.)
let savedViewport: Viewport | null = null

export default function LogicEditor() {
  // useReactFlow (below) needs to be inside a ReactFlowProvider.
  return (
    <ReactFlowProvider>
      <LogicCanvas />
    </ReactFlowProvider>
  )
}

// The open "Add node" menu: where it is on the page, where the new node
// goes on the graph, and the node to wire it after (a wire dragged into
// empty space), if any.
type MenuState = {
  x: number
  y: number
  at: { x: number; y: number }
  after: GraphNodeId | null
}

function LogicCanvas() {
  const graph = useDocumentStore((state) => state.document.logic) ?? EMPTY_GRAPH
  const elements = useDocumentStore((state) => state.document.nodes)
  const store = useDocumentStore.getState
  const { screenToFlowPosition } = useReactFlow()
  const paneRef = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)

  // React Flow's copy of the graph nodes. Rebuilt whenever the store's
  // graph (or an element's name) changes, keeping what only React Flow
  // knows. (Adjusting state while rendering, as the Explorer does for the
  // selection: see "You Might Not Need an Effect" in React's docs.)
  const [nodes, setNodes] = useState(() => toFlowNodes(graph, elements, []))
  const [synced, setSynced] = useState({ graph, elements })
  if (synced.graph !== graph || synced.elements !== elements) {
    setSynced({ graph, elements })
    setNodes((previous) => toFlowNodes(graph, elements, previous))
  }

  // Wires: only their selection is React Flow's.
  const [selectedWires, setSelectedWires] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const edges = useMemo<Edge[]>(
    () =>
      graph.wires.map((wire) => ({
        id: wire.id,
        source: wire.from,
        sourceHandle: 'next',
        target: wire.to,
        targetHandle: 'in',
        selected: selectedWires.has(wire.id),
      })),
    [graph.wires, selectedWires],
  )

  // Everything React Flow reports about nodes: moves go to the store (one
  // undo step per drag, see onNodeDragStart), the rest only to its copy.
  // Deleting is onDelete's job.
  const onNodesChange = useCallback(
    (changes: NodeChangeset<GraphFlowNode>) => {
      const moves: Record<GraphNodeId, { x: number; y: number }> = {}
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          moves[change.id] = change.position
        }
      }
      setNodes((previous) => changes.applyTo(previous))
      if (Object.keys(moves).length > 0) store().moveGraphNodes(moves)
    },
    [store],
  )

  const onEdgesChange = useCallback((changes: EdgeChangeset<Edge>) => {
    setSelectedWires((previous) => {
      const next = new Set(previous)
      for (const change of changes) {
        if (change.type !== 'select') continue
        if (change.selected) next.add(change.id)
        else next.delete(change.id)
      }
      return next
    })
  }, [])

  // Opens the Add node menu at a point on the page.
  const openMenu = useCallback(
    (x: number, y: number, after: GraphNodeId | null = null) => {
      setMenu({ x, y, at: screenToFlowPosition({ x, y }), after })
    },
    [screenToFlowPosition],
  )

  // A wire let go of in empty space: offer the actions that could follow,
  // and wire the one you pick after where the wire started (a quick way
  // to build a chain without lining handles up).
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connection: FinalConnectionState) => {
      if (connection.isValid || !connection.fromNode) return
      if (connection.fromHandle?.type !== 'source' || connection.toNode) return
      const point = 'changedTouches' in event ? event.changedTouches[0] : event
      openMenu(point.clientX, point.clientY, connection.fromNode.id)
    },
    [openMenu],
  )

  // Adds the picked kind where the menu opened (wired after `after`, all
  // as one undo step), then closes the menu.
  function addNode(kind: GraphNodeKind) {
    if (!menu) return
    const { beginGroup, endGroup, addGraphNode, connectGraphNodes } = store()
    beginGroup()
    // Centred on the point down the side (its handles are mid-height).
    const id = addGraphNode(kind, { x: menu.at.x, y: menu.at.y - 32 })
    if (menu.after) connectGraphNodes(menu.after, id)
    endGroup()
    setMenu(null)
  }

  // The menu from a button: it opens under the button, and the node goes
  // in the middle of the view.
  function openMenuFromButton(button: HTMLElement) {
    const pane = paneRef.current?.getBoundingClientRect()
    const box = button.getBoundingClientRect()
    if (!pane) return
    const middle = screenToFlowPosition({
      x: pane.left + pane.width / 2 - 104, // half a node's width
      y: pane.top + pane.height / 2,
    })
    setMenu({ x: box.left, y: box.bottom + 4, at: middle, after: null })
  }

  const isEmpty = nodes.length === 0

  return (
    <div ref={paneRef} className="logic-graph relative min-h-0 min-w-0">
      <ReactFlow<GraphFlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onDelete={({ nodes: gone, edges: cut }) =>
          store().deleteGraphItems(
            gone.map((node) => node.id),
            cut.map((edge) => edge.id),
          )
        }
        isValidConnection={(c) =>
          canConnect(store().document.logic ?? EMPTY_GRAPH, c.source, c.target)
        }
        onConnect={(c: Connection) =>
          store().connectGraphNodes(c.source, c.target)
        }
        onConnectEnd={onConnectEnd}
        // A drag is many small moves: make it one undo step.
        onNodeDragStart={() => store().beginGroup()}
        onNodeDragStop={() => store().endGroup()}
        onSelectionDragStart={() => store().beginGroup()}
        onSelectionDragStop={() => store().endGroup()}
        onPaneContextMenu={(event) => {
          event.preventDefault()
          openMenu(event.clientX, event.clientY)
        }}
        onNodeContextMenu={(event) => event.preventDefault()}
        onEdgeContextMenu={(event) => event.preventDefault()}
        // Like the Design canvas: drag across empty space to select (a node
        // the box touches counts), scroll or hold Space to pan, pinch or
        // ⌘-scroll to zoom. Delete or Backspace removes the selection.
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1]}
        panOnScroll
        zoomOnDoubleClick={false}
        deleteKeyCode={['Backspace', 'Delete']}
        forceColorMode="dark"
        minZoom={0.25}
        maxZoom={2}
        defaultViewport={savedViewport ?? undefined}
        fitView={savedViewport === null}
        fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
        onMoveEnd={(_, viewport) => {
          savedViewport = viewport
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
        <Controls showInteractive={false} position="bottom-left" />
        <Panel position="top-left">
          <Button
            icon={<PlusIcon size={14} />}
            onClick={(event) => openMenuFromButton(event.currentTarget)}
          >
            Add node
          </Button>
        </Panel>
        {!isEmpty && (
          <Panel
            position="bottom-center"
            className="text-note text-muted select-none"
          >
            Right-click to add · drag from a dot to wire · ⌫ to delete
          </Panel>
        )}
      </ReactFlow>

      {/* With nothing yet, say what the graph is for and how to start. */}
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="max-w-sm text-center">
            <p className="text-title text-ink">Make your UI do things</p>
            <p className="mt-1.5 text-body text-muted">
              Start with an event, like{' '}
              <span className="text-ink">When pressed</span>, then wire what
              should happen after it. Right-click anywhere to add one. It
              exports as a LocalScript.
            </p>
          </div>
        </div>
      )}

      {menu && (
        <AddNodeMenu
          x={menu.x}
          y={menu.y}
          actionsOnly={menu.after !== null}
          onPick={addNode}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

// The store's graph nodes as React Flow nodes. Each keeps what React Flow
// had found out about it (selected, measured size, mid-drag), and its old
// `data` when nothing in it changed, so GraphNodeView's memo can skip it.
function toFlowNodes(
  graph: LogicGraph,
  elements: Record<NodeId, UiNode>,
  previous: GraphFlowNode[],
): GraphFlowNode[] {
  const before = new Map(previous.map((node) => [node.id, node]))
  return Object.values(graph.nodes).map((graphNode) => {
    const old = before.get(graphNode.id)
    const found = graphNode.element ? elements[graphNode.element] : undefined
    const element = found
      ? { name: found.name, className: found.className }
      : null
    const sameData =
      old &&
      old.data.graphNode === graphNode &&
      old.data.element?.name === element?.name &&
      old.data.element?.className === element?.className
    return {
      id: graphNode.id,
      type: 'graph',
      position: graphNode.at,
      data: sameData ? old.data : { graphNode, element },
      selected: old?.selected ?? false,
      dragging: old?.dragging,
      measured: old?.measured,
    }
  })
}
