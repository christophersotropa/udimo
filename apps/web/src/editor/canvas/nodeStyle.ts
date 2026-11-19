import type { CSSProperties } from 'react'
import { color3ToCss } from '../../lib/color.ts'
import { boxCss } from '../../lib/udim2.ts'
import { isTextClass } from '../../model/classes.ts'
import { resolveProps } from '../../model/defaults.ts'
import type { UiNode } from '../../model/types.ts'

// The CSS for one Roblox element on the canvas.
export function nodeStyle(node: UiNode): CSSProperties {
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
  }

  return style
}
