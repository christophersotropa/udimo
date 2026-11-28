import { Handle, type Node, type NodeProps, Position } from '@xyflow/react'
import { memo } from 'react'
import { GRAPH_NODE_KINDS, type GraphNode } from '../../model/graph.ts'
import type { ClassName } from '../../model/types.ts'
import { ClassIcon } from '../panels/ClassIcon.tsx'

// One graph node as React Flow draws it. `data` carries the graph node
// itself and the element it points at (looked up by LogicEditor, so this
// component doesn't read the store).
export type GraphFlowNode = Node<
  {
    graphNode: GraphNode
    element: { name: string; className: ClassName } | null
  },
  'graph'
>

// A card: a header with the node's role (a coloured dot, and "Event" or
// "Action") and title, then the element it works on. Wires join the round
// handles: "in" on the left (actions only: events start a chain, so
// nothing leads into them) and "next" on the right.
// memo: React Flow redraws nodes often while you drag; this skips a node
// whose props didn't change.
export const GraphNodeView = memo(function GraphNodeView({
  data,
  selected,
}: NodeProps<GraphFlowNode>) {
  const { graphNode, element } = data
  const info = GRAPH_NODE_KINDS[graphNode.kind]
  const isEvent = info.role === 'event'
  return (
    <div
      title={info.hint}
      className={`w-52 rounded-md bg-raised text-body shadow-[0_6px_18px_rgb(0_0_0/0.35)] ring-1 ${
        selected ? 'ring-select' : 'ring-line'
      }`}
    >
      <div className="flex h-8 items-center gap-2 border-b border-line px-2.5">
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${isEvent ? 'bg-event' : 'bg-action'}`}
        />
        <span className="flex-1 truncate font-medium text-ink">
          {info.title}
        </span>
        <span className="text-note text-muted">
          {isEvent ? 'Event' : 'Action'}
        </span>
      </div>
      <div className="flex h-8 items-center gap-2 px-2.5">
        {element ? (
          <>
            <ClassIcon className={element.className} />
            <span className="truncate text-ink">{element.name}</span>
          </>
        ) : (
          // Picking one comes with element references (build 61).
          <span className="text-muted">No element yet</span>
        )}
      </div>
      {!isEvent && (
        <Handle
          type="target"
          id="in"
          position={Position.Left}
          className="graph-handle"
        />
      )}
      <Handle
        type="source"
        id="next"
        position={Position.Right}
        className="graph-handle"
      />
    </div>
  )
})
