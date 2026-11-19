import { color3ToCss } from '../../lib/color.ts'
import { isTextClass } from '../../model/classes.ts'
import { resolveProps } from '../../model/defaults.ts'
import type { NodeId } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { nodeStyle } from './nodeStyle.ts'
import { ResizeHandles } from './ResizeHandles.tsx'

// Draws one node, then draws each of its children inside it, and so on down
// the tree. A component that renders itself like this is called recursive.
// Each NodeView reads only its own node from the store, so changing one
// element re-renders just that element.
export function NodeView({ id }: { id: NodeId }) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  const isSelected = useDocumentStore((state) => state.selection.includes(id))
  // Resize handles only when this is the one and only selected element,
  // and it isn't locked.
  const showHandles = useDocumentStore(
    (state) =>
      state.selection.length === 1 &&
      state.selection[0] === id &&
      !state.document.nodes[id]?.locked,
  )
  if (!node) return null

  const children = node.children.map((childId) => (
    <NodeView key={childId} id={childId} />
  ))

  // The ScreenGui is the screen itself: it fills the canvas.
  if (node.className === 'ScreenGui') {
    return <div className="absolute inset-0">{children}</div>
  }

  // An outline is drawn outside the element without changing its size,
  // so selecting never shifts the layout.
  const style = isSelected
    ? {
        ...nodeStyle(node),
        outline: 'calc(2px / var(--canvas-scale)) solid rgb(59 130 246)',
      }
    : nodeStyle(node)

  return (
    <div style={style} data-node-id={node.id} title={node.name}>
      {isTextClass(node.className) && <NodeText id={id} />}
      {children}
      {showHandles && <ResizeHandles />}
    </div>
  )
}

// The words inside a text element. An empty TextBox shows its
// PlaceholderText in PlaceholderColor3 instead, like it does in game.
// TextBoxes and TextButtons are drawn, not real inputs or buttons: on the
// canvas you click them to select them, not to type or press.
function NodeText({ id }: { id: NodeId }) {
  const node = useDocumentStore((state) => state.document.nodes[id])
  if (!node) return null
  const p = resolveProps(node)
  if (node.className === 'TextBox' && p.Text === '') {
    return (
      <span style={{ color: color3ToCss(p.PlaceholderColor3) }}>
        {p.PlaceholderText}
      </span>
    )
  }
  return <span>{p.Text}</span>
}
