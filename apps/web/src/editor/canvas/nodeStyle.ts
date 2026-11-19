import type { CSSProperties } from 'react'
import { color3ToCss } from '../../lib/color.ts'
import { gradientCss } from '../../lib/gradient.ts'
import { boxCss } from '../../lib/udim2.ts'
import { isTextClass } from '../../model/classes.ts'
import { resolveProps } from '../../model/defaults.ts'
import { resolveModifier } from '../../model/modifiers.ts'
import type { Box } from '../../model/layout.ts'
import type { ScreenSize } from '../../model/screen.ts'
import type { UiNode } from '../../model/types.ts'

// Pixel values the caller works out from the whole document (they depend
// on the element's size on screen, which this function can't see).
export type NodePixels = {
  cornerRadius: number // UICorner radius, 0 for none
  aspectSize: ScreenSize | null // the size a UIAspectRatioConstraint forces
  // Where the parent's UIListLayout or UIGridLayout puts this element,
  // from the corner of the parent's content area.
  slot: Box | null
}

// The CSS for one Roblox element on the canvas.
export function nodeStyle(node: UiNode, pixels: NodePixels): CSSProperties {
  const p = resolveProps(node)

  const style: CSSProperties = {
    position: 'absolute',
    ...boxCss(p.Size, p.Position, p.AnchorPoint),
    backgroundColor: color3ToCss(p.BackgroundColor3, p.BackgroundTransparency),
    // Roblox draws children above their parent and orders siblings by ZIndex.
    // A CSS z-index does the same: it only competes with siblings.
    zIndex: p.ZIndex,
    display: p.Visible ? undefined : 'none',
    // A locked element ignores the mouse: clicks pass through to whatever is
    // underneath. 'auto' (not unset) matters, because pointer-events is
    // inherited: without it, a locked Frame's children would ignore it too.
    pointerEvents: node.locked ? 'none' : 'auto',
    borderRadius: pixels.cornerRadius || undefined,
  }

  // A UIAspectRatioConstraint replaces the UDim2 size with its own.
  // (Position and AnchorPoint still work: AnchorPoint's shift uses the
  // element's actual size.)
  if (pixels.aspectSize) {
    style.width = pixels.aspectSize.width
    style.height = pixels.aspectSize.height
  }

  // A layout decides where the element goes, ignoring Position and
  // AnchorPoint (and, in a grid, Size), so it's drawn at the layout's box.
  if (pixels.slot) {
    Object.assign(style, {
      left: pixels.slot.x,
      top: pixels.slot.y,
      width: pixels.slot.width,
      height: pixels.slot.height,
      transform: 'none',
    } satisfies CSSProperties)
  }

  const gradient = resolveModifier(node, 'UIGradient')
  if (gradient) {
    style.backgroundColor = undefined
    style.backgroundImage = gradientCss(
      p.BackgroundColor3,
      p.BackgroundTransparency,
      gradient,
    )
  }

  // UIStroke draws an outline outside the element's edge. On a text element
  // it outlines the text instead (Roblox's default "Contextual" mode).
  const stroke = resolveModifier(node, 'UIStroke')
  const strokeOnText = stroke !== null && isTextClass(node.className)
  if (stroke && stroke.Thickness > 0 && !strokeOnText) {
    // A shadow with no blur, spread outwards, follows rounded corners too.
    const color = color3ToCss(stroke.Color, stroke.Transparency)
    style.boxShadow = `0 0 0 ${stroke.Thickness}px ${color}`
  }

  if (isTextClass(node.className)) {
    // Roblox centers text both ways by default (NodeView's content area does
    // the centering) and doesn't wrap it. These are inherited by the text.
    Object.assign(style, {
      whiteSpace: 'pre',
      lineHeight: 1,
      color: color3ToCss(p.TextColor3),
      fontSize: p.TextSize,
    } satisfies CSSProperties)

    if (strokeOnText && stroke.Thickness > 0) {
      // A text stroke is centered on the letter outlines. Drawing it twice
      // as thick, behind the letters (paint-order), leaves Thickness
      // pixels showing outside them, like Roblox.
      Object.assign(style, {
        WebkitTextStroke: `${stroke.Thickness * 2}px ${color3ToCss(stroke.Color, stroke.Transparency)}`,
        paintOrder: 'stroke fill',
      } satisfies CSSProperties)
    }
  }

  return style
}
