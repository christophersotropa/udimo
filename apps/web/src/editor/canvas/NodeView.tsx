import { resolveProps } from '../../model/defaults.ts'
import type { NodeId } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { nodeStyle } from './nodeStyle.ts'

// Draws one node, then draws each of its children inside it, and so on down
// the tree. A component that renders itself like this is called recursive.
// Each NodeView reads only its own node from the store, so changing one
// element re-renders just that element.
export function NodeView({ id }: { id: NodeId }) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  if (!node) return null

  const children = node.children.map((childId) => (
    <NodeView key={childId} id={childId} />
  ))

  // The ScreenGui is the screen itself: it fills the canvas.
  if (node.className === 'ScreenGui') {
    return <div className="absolute inset-0">{children}</div>
  }

  return (
    <div style={nodeStyle(node)} data-node-id={node.id} title={node.name}>
      {node.className === 'TextLabel' && <span>{resolveProps(node).Text}</span>}
      {children}
    </div>
  )
}
