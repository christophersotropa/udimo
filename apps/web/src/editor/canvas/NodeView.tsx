import type { ReactNode } from 'react'
import { color3ToCss } from '../../lib/color.ts'
import { udimToCss } from '../../lib/udim2.ts'
import { isImageClass, isTextClass } from '../../model/classes.ts'
import { resolveProps } from '../../model/defaults.ts'
import { visibleFraction } from '../../model/layout.ts'
import { cornerRadiusPixels } from '../../model/modifiers.ts'
import { SCREEN } from '../../model/screen.ts'
import type { NodeId, UiNode } from '../../model/types.ts'
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
  // A plain number, so this only re-renders when the radius really changes.
  const cornerRadius = useDocumentStore((state) =>
    state.document.nodes[id]?.modifiers?.UICorner
      ? cornerRadiusPixels(state.document, id, SCREEN)
      : 0,
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
        ...nodeStyle(node, cornerRadius),
        outline: 'calc(2px / var(--canvas-scale)) solid rgb(59 130 246)',
      }
    : nodeStyle(node, cornerRadius)

  return (
    <div style={style} data-node-id={node.id} title={node.name}>
      {isImageClass(node.className) && <ImagePlaceholder node={node} />}
      {isTextClass(node.className) && <NodeText id={id} />}
      {node.className === 'ScrollingFrame' ? (
        <ScrollingContent node={node}>{children}</ScrollingContent>
      ) : (
        children
      )}
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

// The browser can't load Roblox images (they need Roblox's servers), so an
// image element shows a simple picture icon instead. An empty Image shows
// nothing, like in game.
function ImagePlaceholder({ node }: { node: UiNode }) {
  if (resolveProps(node).Image === '') return null
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgb(161 161 170)"
      strokeWidth={1.5}
      aria-hidden="true"
      className="absolute inset-0 m-auto h-1/2 w-1/2"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M3 17l5-5 4 4 3-3 6 6" />
    </svg>
  )
}

// A ScrollingFrame's children sit on its canvas, which is CanvasSize big
// (never smaller than the frame) and is clipped to the frame, like Roblox's
// ClipsDescendants. It's shown scrolled to the top, as it starts in game.
// The clipping box is separate from the element itself, so the resize
// handles (which stick out past the edges) aren't clipped away.
function ScrollingContent({
  node,
  children,
}: {
  node: UiNode
  children: ReactNode
}) {
  const { CanvasSize, ScrollBarThickness } = resolveProps(node)
  // Each returns a plain number, so the component only re-renders when the
  // scroll bar length actually changes.
  const shownX = useDocumentStore((state) =>
    visibleFraction(state.document, node.id, SCREEN, 'x'),
  )
  const shownY = useDocumentStore((state) =>
    visibleFraction(state.document, node.id, SCREEN, 'y'),
  )
  const bar = { position: 'absolute', backgroundColor: 'black' } as const

  return (
    // borderRadius 'inherit': with a UICorner, the clipping is rounded too.
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ borderRadius: 'inherit' }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: `max(100%, ${udimToCss(CanvasSize.xs, CanvasSize.xo)})`,
          height: `max(100%, ${udimToCss(CanvasSize.ys, CanvasSize.yo)})`,
        }}
      >
        {children}
      </div>
      {/* Scroll bars only show on an axis with more canvas than frame. */}
      {shownY < 1 && ScrollBarThickness > 0 && (
        <div
          style={{
            ...bar,
            top: 0,
            right: 0,
            width: ScrollBarThickness,
            height: `${shownY * 100}%`,
          }}
        />
      )}
      {shownX < 1 && ScrollBarThickness > 0 && (
        <div
          style={{
            ...bar,
            left: 0,
            bottom: 0,
            height: ScrollBarThickness,
            width: `${shownX * 100}%`,
          }}
        />
      )}
    </div>
  )
}
