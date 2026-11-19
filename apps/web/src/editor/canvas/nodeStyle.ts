import type { CSSProperties } from 'react'
import { color3ToCss } from '../../lib/color.ts'
import { boxCss } from '../../lib/udim2.ts'
import { isTextClass } from '../../model/classes.ts'
import { resolveProps } from '../../model/defaults.ts'
import { resolveModifier } from '../../model/modifiers.ts'
import type { UiNode } from '../../model/types.ts'

// The CSS for one Roblox element on the canvas. `cornerRadius` is the
// UICorner radius in pixels, worked out by the caller (it depends on the
// element's size on screen, which this function can't see).
export function nodeStyle(node: UiNode, cornerRadius = 0): CSSProperties {
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
    borderRadius: cornerRadius || undefined,
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
    Object.assign(style, {
      // Roblox centers text both ways by default and doesn't wrap it.
      display: p.Visible ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
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
