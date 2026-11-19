import { type ReactNode, useEffect, useState } from 'react'
import { toContentUri } from '../../lib/assets.ts'
import { color3ToCss } from '../../lib/color.ts'
import {
  measureLineHeight,
  measureTextWidth,
  scaledTextSize,
} from '../../lib/text.ts'
import { udimToCss } from '../../lib/udim2.ts'
import { isImageClass, isTextClass } from '../../model/classes.ts'
import { PLACEHOLDER_IMAGE, resolveProps } from '../../model/defaults.ts'
import { useShallow } from 'zustand/react/shallow'
import { FONT_WEIGHT } from '../../model/enums.ts'
import { FONTS } from '../../model/fonts.ts'
import {
  absoluteBox,
  contentArea,
  cornerRadiusPixels,
  layoutSlot,
  visibleFraction,
} from '../../model/layout.ts'
import { resolveModifier } from '../../model/modifiers.ts'
import type { NodeId, UiNode } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'
import { nodeStyle } from './nodeStyle.ts'
import { ResizeHandles } from './ResizeHandles.tsx'

// Draws one node, then draws each of its children inside it, and so on down
// the tree. A component that renders itself like this is called recursive.
// Each NodeView reads only its own node from the store, so changing one
// element re-renders just that element.
export function NodeView({ id }: { id: NodeId }) {
  // The device screen everything is laid out on (its size feeds the pixel
  // maths below).
  const screen = useViewStore(screenOf)
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
      ? cornerRadiusPixels(state.document, id, screen)
      : 0,
  )
  // The size a UIAspectRatioConstraint forces, and the box a parent's
  // layout gives this element (each null if there's none). useShallow lets
  // a selector return a small object: the component only re-renders when
  // one of its values changes, not every time a new, identical object is
  // made.
  const aspectSize = useDocumentStore(
    useShallow((state) => {
      if (!state.document.nodes[id]?.modifiers?.UIAspectRatioConstraint) {
        return null
      }
      const { width, height } = absoluteBox(state.document, id, screen)
      return { width, height }
    }),
  )
  const slot = useDocumentStore(
    useShallow((state) => layoutSlot(state.document, id, screen)),
  )
  if (!node) return null

  const children = node.children.map((childId) => (
    <NodeView key={childId} id={childId} />
  ))

  // The ScreenGui is the screen itself: it fills the canvas.
  if (node.className === 'ScreenGui') {
    return <div className="absolute inset-0">{children}</div>
  }

  const pixels = { cornerRadius, aspectSize, slot }
  // An outline is drawn outside the element without changing its size,
  // so selecting never shifts the layout.
  const style = isSelected
    ? {
        ...nodeStyle(node, pixels),
        outline: 'calc(1.5px / var(--canvas-scale)) solid var(--color-accent)',
      }
    : nodeStyle(node, pixels)

  // Text and children sit in the content area (inside any UIPadding).
  // A ScrollingFrame's content area is on its scrollable canvas.
  const content = (
    <ContentArea node={node}>
      {isTextClass(node.className) && <NodeText id={id} />}
      {children}
    </ContentArea>
  )

  return (
    <div style={style} data-node-id={node.id} title={node.name}>
      {isImageClass(node.className) && <ImagePlaceholder node={node} />}
      {node.className === 'ScrollingFrame' ? (
        <ScrollingContent node={node}>{content}</ScrollingContent>
      ) : (
        content
      )}
      {showHandles && <ResizeHandles />}
    </div>
  )
}

// The box an element's text and children are laid out in: the whole
// element, minus any UIPadding. It's positioned, so children's percentages
// (Scale) are measured against it, like contentArea in model/layout.ts.
// Text is centered in it both ways, like Roblox's default alignment.
function ContentArea({
  node,
  children,
}: {
  node: UiNode
  children: ReactNode
}) {
  const padding = resolveModifier(node, 'UIPadding')
  // CSS left/right percentages are of the width, top/bottom of the height:
  // the same as UIPadding's Scale.
  const inset = padding
    ? {
        left: udimToCss(padding.PaddingLeft.s, padding.PaddingLeft.o),
        right: udimToCss(padding.PaddingRight.s, padding.PaddingRight.o),
        top: udimToCss(padding.PaddingTop.s, padding.PaddingTop.o),
        bottom: udimToCss(padding.PaddingBottom.s, padding.PaddingBottom.o),
      }
    : { inset: 0 }
  const centered = isTextClass(node.className)
    ? 'flex items-center justify-center'
    : ''
  return (
    <div className={`absolute ${centered}`} style={inset}>
      {children}
    </div>
  )
}

// The words inside a text element. An empty TextBox shows its
// PlaceholderText in PlaceholderColor3 instead, like it does in game.
// TextBoxes and TextButtons are drawn, not real inputs or buttons: on the
// canvas you click them to select them, not to type or press.
function NodeText({ id }: { id: NodeId }) {
  const screen = useViewStore(screenOf)
  const node = useDocumentStore((state) => state.document.nodes[id])
  // With TextScaled, the size of the box the text must fit in (inside any
  // padding), else null.
  const scaledArea = useDocumentStore(
    useShallow((state) => {
      const current = state.document.nodes[id]
      if (!current || !resolveProps(current).TextScaled) return null
      const box = absoluteBox(state.document, id, screen)
      const { width, height } = contentArea(current, box)
      return { width, height }
    }),
  )
  useFontsLoaded()
  if (!node) return null

  const p = resolveProps(node)
  const placeholder = node.className === 'TextBox' && p.Text === ''
  const text = placeholder ? p.PlaceholderText : p.Text

  // TextScaled: measure the widest line in this font, then pick the biggest
  // size that fits (see lib/text.ts).
  let fontSize: number | undefined
  if (scaledArea) {
    const weight = FONT_WEIGHT[p.FontFace.weight]
    const cssFont = `${weight} 100px ${FONTS[p.FontFace.family].css}`
    const lines = text.split('\n')
    const widest = Math.max(
      ...lines.map((line) => measureTextWidth(line, cssFont)),
    )
    fontSize = scaledTextSize(
      widest / 100,
      lines.length,
      scaledArea,
      measureLineHeight(cssFont),
    )
  }

  return (
    <span
      style={{
        fontSize,
        color: placeholder ? color3ToCss(p.PlaceholderColor3) : undefined,
      }}
    >
      {text}
    </span>
  )
}

// Re-renders the component whenever the browser finishes loading a font.
// Text measured before its web font arrived was measured in a fallback
// font, so TextScaled sizes are worked out again once it's there.
function useFontsLoaded() {
  const [, setLoads] = useState(0)
  useEffect(() => {
    const onLoaded = () => setLoads((count) => count + 1)
    document.fonts.addEventListener('loadingdone', onLoaded)
    return () => document.fonts.removeEventListener('loadingdone', onLoaded)
  }, [])
}

// What an image element shows. An empty Image shows nothing, like in game.
//
// Studio's placeholder is itself a picture: a white square with a grey
// picture icon. Like any image it fills the whole element and covers its
// background (a red button with the placeholder looks white in Studio), so
// it's drawn the same way, rounded with the element's corners.
//
// Real images can't be shown (the browser can't load them from Roblox's
// servers), so those get just the grey icon, over the background.
function ImagePlaceholder({ node }: { node: UiNode }) {
  const uri = toContentUri(resolveProps(node).Image)
  if (uri === '') return null
  const icon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgb(200 200 205)"
      strokeWidth={1.5}
      aria-hidden="true"
      className="absolute inset-0 m-auto h-1/2 w-1/2"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M3 17l5-5 4 4 3-3 6 6" />
    </svg>
  )
  if (uri !== PLACEHOLDER_IMAGE) return icon
  return (
    <div
      className="absolute inset-0 bg-[rgb(245_245_245)]"
      style={{ borderRadius: 'inherit' }}
    >
      {icon}
    </div>
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
  const screen = useViewStore(screenOf)
  const { CanvasSize, ScrollBarThickness } = resolveProps(node)
  // Each returns a plain number, so the component only re-renders when the
  // scroll bar length actually changes.
  const shownX = useDocumentStore((state) =>
    visibleFraction(state.document, node.id, screen, 'x'),
  )
  const shownY = useDocumentStore((state) =>
    visibleFraction(state.document, node.id, screen, 'y'),
  )
  // Studio draws its default scroll bar as a light grey bar with round
  // ends (compared side by side in build 33), so the canvas does too.
  const bar = {
    position: 'absolute',
    backgroundColor: 'rgb(165 165 165)',
    borderRadius: ScrollBarThickness / 2,
  } as const

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
