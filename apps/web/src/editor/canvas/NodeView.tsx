import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { toContentUri } from '../../lib/assets.ts'
import { richTextPlain } from '../../lib/richText.ts'
import { isWhite, tintImage } from '../../lib/tintImage.ts'
import { color3ToCss } from '../../lib/color.ts'
import {
  measureLineHeight,
  measureTextWidth,
  scaledTextSize,
  scaledWrappedTextSize,
} from '../../lib/text.ts'
import { udimToCss } from '../../lib/udim2.ts'
import { isImageClass, isTextClass } from '../../model/classes.ts'
import { PLACEHOLDER_IMAGE, resolveProps } from '../../model/defaults.ts'
import { useShallow } from 'zustand/react/shallow'
import { fontCss } from '../../model/fonts.ts'
import {
  absoluteBox,
  canvasSize,
  contentArea,
  cornerRadiusPixels,
  layoutSlot,
  visibleFraction,
} from '../../model/layout.ts'
import { resolveModifier } from '../../model/modifiers.ts'
import type { Color3, NodeId, PreviewImage, UiNode } from '../../model/types.ts'
import { useDocumentStore } from '../../store/documentStore.ts'
import { screenOf, useViewStore } from '../../store/viewStore.ts'
import { nodeStyle } from './nodeStyle.ts'
import { ResizeHandles } from './ResizeHandles.tsx'
import { RichTextView } from './RichTextView.tsx'
import { imageLayerStyle } from './imageStyle.ts'

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
  // The size a UIAspectRatioConstraint forces or AutomaticSize grows to,
  // and the box a parent's layout gives this element (each null if there's
  // none). useShallow lets a selector return a small object: the component
  // only re-renders when one of its values changes, not every time a new,
  // identical object is made.
  const fixedSize = useDocumentStore(
    useShallow((state) => {
      const n = state.document.nodes[id]
      const automatic = n?.props.AutomaticSize
      if (
        !n?.modifiers?.UIAspectRatioConstraint &&
        (!automatic || automatic === 'None')
      ) {
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

  const pixels = { cornerRadius, fixedSize, slot }
  // An outline is drawn outside the element without changing its size,
  // so selecting never shifts the layout.
  const style = isSelected
    ? {
        ...nodeStyle(node, pixels),
        outline: 'calc(1.5px / var(--canvas-scale)) solid var(--color-select)',
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

  // A CanvasGroup draws its background, border and contents as one
  // picture, faded and tinted together, on a layer of its own; the outer
  // box keeps the selection outline and resize handles, so they stay
  // clear however faded or tinted the group is.
  if (node.className === 'CanvasGroup') {
    const { backgroundColor, backgroundImage, boxShadow, ...outer } = style
    return (
      <div style={outer} data-node-id={node.id} title={node.name}>
        <GroupLayer
          node={node}
          paint={{ backgroundColor, backgroundImage, boxShadow }}
        >
          {resolveProps(node).ClipsDescendants ? (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ borderRadius: 'inherit' }}
            >
              {content}
            </div>
          ) : (
            content
          )}
        </GroupLayer>
        {showHandles && <ResizeHandles />}
      </div>
    )
  }

  return (
    <div style={style} data-node-id={node.id} title={node.name}>
      {isImageClass(node.className) && <ImageContent node={node} />}
      {node.className === 'ScrollingFrame' ? (
        <ScrollingContent node={node}>{content}</ScrollingContent>
      ) : resolveProps(node).ClipsDescendants ? (
        // ClipsDescendants: children are cut off at the element's edges
        // (rounded too, with a UICorner). A separate box, so the resize
        // handles, which stick out, aren't cut off.
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ borderRadius: 'inherit' }}
        >
          {content}
        </div>
      ) : (
        content
      )}
      {showHandles && <ResizeHandles />}
    </div>
  )
}

// A CanvasGroup's picture: its background and border (`paint`) and its
// contents, faded by GroupTransparency and tinted by GroupColor3 as one.
// CSS opacity already works that way: it draws everything inside first,
// then fades the result, so overlapping children don't show through each
// other. The tint multiplies each colour channel by GroupColor3's, which
// CSS has no word for; an SVG filter does it (feColorMatrix scales red,
// green and blue by r, g and b), in sRGB, the colours Roblox multiplies in.
function GroupLayer({
  node,
  paint,
  children,
}: {
  node: UiNode
  paint: CSSProperties
  children: ReactNode
}) {
  const { GroupTransparency, GroupColor3 } = resolveProps(node)
  // An id for the filter, unique on the page (React's useId), with only
  // letters and digits so it's safe inside url(#...).
  const filterId = `group-tint-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const tinted = !isWhite(GroupColor3)
  const { r, g, b } = GroupColor3
  return (
    <div
      className="absolute inset-0"
      style={{
        ...paint,
        borderRadius: 'inherit',
        opacity: 1 - GroupTransparency,
        filter: tinted ? `url(#${filterId})` : undefined,
      }}
    >
      {tinted && (
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values={`${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`}
            />
          </filter>
        </svg>
      )}
      {children}
    </div>
  )
}

// TextXAlignment and TextYAlignment as flexbox classes, for placing text
// in its box.
const JUSTIFY = {
  Left: 'justify-start',
  Center: 'justify-center',
  Right: 'justify-end',
} as const
const ALIGN_ITEMS = {
  Top: 'items-start',
  Center: 'items-center',
  Bottom: 'items-end',
} as const

// The box an element's text and children are laid out in: the whole
// element, minus any UIPadding. It's positioned, so children's percentages
// (Scale) are measured against it, like contentArea in model/layout.ts.
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
  // Text sits where TextXAlignment and TextYAlignment say (Roblox's
  // default: centered both ways).
  const p = resolveProps(node)
  const placed = isTextClass(node.className)
    ? `flex ${JUSTIFY[p.TextXAlignment]} ${ALIGN_ITEMS[p.TextYAlignment]}`
    : ''
  return (
    <div className={`absolute ${placed}`} style={inset}>
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
  // The size of the box the text must fit in (inside any padding), when
  // it's needed: for TextScaled, or to cut wrapped text off at the right
  // line (TextTruncate). Else null.
  const area = useDocumentStore(
    useShallow((state) => {
      const current = state.document.nodes[id]
      if (!current) return null
      const q = resolveProps(current)
      const needed =
        q.TextScaled || (q.TextWrapped && q.TextTruncate !== 'None')
      if (!needed) return null
      const box = absoluteBox(state.document, id, screen)
      const { width, height } = contentArea(current, box)
      return { width, height }
    }),
  )
  useFontsLoaded()
  const editing = useViewStore((state) => state.editingTextId === id)
  if (!node) return null

  const p = resolveProps(node)
  const placeholder = node.className === 'TextBox' && p.Text === ''
  const text = placeholder ? p.PlaceholderText : p.Text

  // RichText draws styled runs; its tags aren't measured.
  const rich = p.RichText && !placeholder
  const words = rich ? richTextPlain(text) : text

  // TextScaled: measure the text in this font, then pick the biggest size
  // that fits (see lib/text.ts). Wrapped text may use more lines instead
  // of shrinking.
  let fontSize: number | undefined
  if (area && p.TextScaled) {
    const cssFont = fontCss(p.FontFace, 100)
    const lineHeight = measureLineHeight(cssFont) * p.LineHeight
    const lines = words.split('\n')
    const perPixel = (part: string) => measureTextWidth(part, cssFont) / 100
    fontSize = p.TextWrapped
      ? scaledWrappedTextSize(
          lines.map((line) => line.split(' ').map(perPixel)),
          perPixel(' '),
          area,
          lineHeight,
        )
      : scaledTextSize(
          Math.max(...lines.map(perPixel)),
          lines.length,
          area,
          lineHeight,
        )
    // UITextSizeConstraint: the size TextScaled picks stays within its
    // MinTextSize and MaxTextSize.
    const limits = resolveModifier(node, 'UITextSizeConstraint')
    if (limits) {
      fontSize = Math.min(
        Math.max(fontSize, limits.MinTextSize),
        limits.MaxTextSize,
      )
    }
  }

  // TextTruncate: text that doesn't fit ends in "…". One line at a time
  // when not wrapping; wrapped, after the last line that fits.
  const truncate: CSSProperties =
    p.TextTruncate === 'None' || p.TextScaled
      ? {}
      : p.TextWrapped && area
        ? {
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: Math.max(
              1,
              Math.floor(area.height / (p.TextSize * p.LineHeight)),
            ),
            overflow: 'hidden',
          }
        : { overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }

  // Being edited (double-click or Enter): the text becomes a text box, in
  // the same place, font and size.
  if (editing) {
    return (
      <CanvasTextEditor
        id={id}
        text={p.Text}
        placeholder={node.className === 'TextBox' ? p.PlaceholderText : ''}
        fontSize={fontSize}
      />
    )
  }

  return (
    <span
      style={{
        fontSize,
        color: placeholder
          ? color3ToCss(p.PlaceholderColor3, p.TextTransparency)
          : undefined,
        // Wrapped text wraps at the box's edges.
        maxWidth: p.TextWrapped ? '100%' : undefined,
        ...truncate,
      }}
    >
      {rich ? <RichTextView text={text} /> : text}
    </span>
  )
}

// The text box for editing an element's text right on the canvas. It looks
// like the text itself (it takes the font, size and colour from around it)
// and grows a line at a time, so nothing jumps while you type.
//   Enter: save   Shift+Enter: new line   Escape: cancel   click away: save
// Saving is a single change, so it's one undo step.
function CanvasTextEditor({
  id,
  text,
  placeholder,
  fontSize,
}: {
  id: NodeId
  text: string
  placeholder: string
  fontSize: number | undefined
}) {
  const [draft, setDraft] = useState(text)
  // A ref, not state: it must be readable in onBlur straight away.
  const cancelled = useRef(false)

  function finish() {
    useViewStore.getState().setEditingTextId(null)
    if (!cancelled.current && draft !== text) {
      useDocumentStore.getState().updateProps(id, { Text: draft })
    }
  }

  return (
    <textarea
      // useCanvasPointer leaves clicks inside this alone (it finds it by
      // this attribute), so they place the caret instead of dragging.
      data-text-editor
      autoFocus // it only appears because you asked to edit
      aria-label="Text"
      spellCheck={false}
      rows={draft.split('\n').length}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.target.select()} // ready to type over
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault() // Enter saves; Shift+Enter makes a new line
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          cancelled.current = true
          event.currentTarget.blur()
        }
      }}
      className="block w-full resize-none overflow-hidden bg-transparent p-0 outline-none"
      style={{
        font: 'inherit',
        fontSize,
        color: 'inherit',
        // Lined up, spaced and wrapped like the text itself (nodeStyle).
        textAlign: 'inherit',
        lineHeight: 'inherit',
        whiteSpace: 'inherit',
        // A thin dashed line around the box, 1 screen pixel at any zoom.
        outline: 'calc(1px / var(--canvas-scale)) dashed var(--color-select)',
      }}
    />
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

// What an image element shows. A preview picture from your computer (see
// UiNode.previewImage) shows as it is. Otherwise: an empty Image shows
// nothing, like in game, and anything else a placeholder (below).
function ImageContent({ node }: { node: UiNode }) {
  const preview = useDocumentStore((state) =>
    node.previewImage ? state.document.images?.[node.previewImage] : undefined,
  )
  if (!preview) return <ImagePlaceholder node={node} />
  return <PreviewPicture node={node} preview={preview} />
}

// A preview picture, drawn the way ScaleType says (see imageStyle.ts),
// tinted by ImageColor3 and faded by ImageTransparency, over the
// background. The outer box clips it to the element's rounded corners
// (UICorner), which CSS's 9-slice wouldn't do by itself.
function PreviewPicture({
  node,
  preview,
}: {
  node: UiNode
  preview: PreviewImage
}) {
  const p = resolveProps(node)
  const url = useTintedImage(preview.dataUrl, p.ImageColor3, node.previewImage!)
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ borderRadius: 'inherit', opacity: 1 - p.ImageTransparency }}
    >
      <div
        className="absolute inset-0"
        style={imageLayerStyle(p, url, preview.width, preview.height)}
      />
    </div>
  )
}

// The picture tinted by ImageColor3 (see lib/tintImage.ts). Tinting takes
// a moment, so until it's ready (or for white, which changes nothing) the
// picture is shown as it is.
function useTintedImage(src: string, color: Color3, imageKey: string): string {
  const { r, g, b } = color
  const tintKey = isWhite(color) ? null : `${imageKey}:${r},${g},${b}`
  const [tinted, setTinted] = useState<{ key: string; url: string } | null>(
    null,
  )
  useEffect(() => {
    if (!tintKey) return
    let current = true // false once a newer colour or picture comes along
    tintImage(src, { r, g, b }, imageKey)
      .then((url) => {
        if (current) setTinted({ key: tintKey, url })
      })
      .catch(() => {}) // can't tint: the plain picture stays
    return () => {
      current = false
    }
  }, [tintKey, src, r, g, b, imageKey])
  return tintKey && tinted?.key === tintKey ? tinted.url : src
}

// Studio's placeholder is itself a picture: a white square with a grey
// picture icon. Like any image it fills the whole element and covers its
// background (a red button with the placeholder looks white in Studio), so
// it's drawn the same way, rounded with the element's corners.
//
// Other Roblox images can't be shown (the browser can't load them from
// Roblox's servers), so those get just the grey icon, over the background.
// Pick a preview picture to see the real thing.
function ImagePlaceholder({ node }: { node: UiNode }) {
  const p = resolveProps(node)
  const uri = toContentUri(p.Image)
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
  // The placeholder is a picture too: ImageColor3 tints its near-white
  // square and ImageTransparency fades it, like any image.
  const tint = (channel: number) => (channel * 245) / 255
  return (
    <div
      className="absolute inset-0"
      style={{
        borderRadius: 'inherit',
        backgroundColor: color3ToCss({
          r: tint(p.ImageColor3.r),
          g: tint(p.ImageColor3.g),
          b: tint(p.ImageColor3.b),
        }),
        opacity: 1 - p.ImageTransparency,
      }}
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
  const {
    CanvasSize,
    ScrollBarThickness,
    AutomaticCanvasSize,
    ScrollingDirection,
    ScrollBarImageColor3,
    ScrollBarImageTransparency,
  } = resolveProps(node)
  // AutomaticCanvasSize: the canvas grows to fit the children, which only
  // the layout maths can work out, so it's given in pixels then. Otherwise
  // CSS works it out from CanvasSize (below). useShallow: re-render only
  // when the size really changes.
  const autoCanvas = useDocumentStore(
    useShallow((state) => {
      if (AutomaticCanvasSize === 'None') return null
      const box = absoluteBox(state.document, node.id, screen)
      const { width, height } = canvasSize(node, box, state.document)
      return { width, height }
    }),
  )
  // Scroll bars only show along the way it can scroll.
  const scrollsX = ScrollingDirection !== 'Y'
  const scrollsY = ScrollingDirection !== 'X'
  // Each returns a plain number, so the component only re-renders when the
  // scroll bar length actually changes.
  const shownX = useDocumentStore((state) =>
    visibleFraction(state.document, node.id, screen, 'x'),
  )
  const shownY = useDocumentStore((state) =>
    visibleFraction(state.document, node.id, screen, 'y'),
  )
  // Studio draws its default scroll bar as a light grey bar with round
  // ends (compared side by side in build 33), even though its default
  // ScrollBarImageColor3 is black, so the default stays that grey; a colour
  // you pick is drawn as it is. ScrollBarImageTransparency applies to both.
  const isDefaultColor =
    ScrollBarImageColor3.r === 0 &&
    ScrollBarImageColor3.g === 0 &&
    ScrollBarImageColor3.b === 0
  const bar = {
    position: 'absolute',
    backgroundColor: isDefaultColor
      ? `rgb(165 165 165 / ${1 - ScrollBarImageTransparency})`
      : color3ToCss(ScrollBarImageColor3, ScrollBarImageTransparency),
    borderRadius: ScrollBarThickness / 2,
  } as const

  return (
    // borderRadius 'inherit': with a UICorner, the clipping is rounded too.
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ borderRadius: 'inherit' }}
    >
      {/* isolate: the children's ZIndex values stay inside this canvas, so
          the scroll bars, drawn after it, are always on top (as in Roblox)
          instead of under a child with ZIndex 1. */}
      <div
        className="absolute top-0 left-0 isolate"
        style={
          autoCanvas ?? {
            width: `max(100%, ${udimToCss(CanvasSize.xs, CanvasSize.xo)})`,
            height: `max(100%, ${udimToCss(CanvasSize.ys, CanvasSize.yo)})`,
          }
        }
      >
        {children}
      </div>
      {/* Scroll bars only show on an axis with more canvas than frame. */}
      {scrollsY && shownY < 1 && ScrollBarThickness > 0 && (
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
      {scrollsX && shownX < 1 && ScrollBarThickness > 0 && (
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
