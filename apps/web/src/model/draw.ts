import { isContainerClass } from './classes.ts'
import { defaultProps, resolveProps } from './defaults.ts'
import { absoluteBox, type Box, contentArea } from './layout.ts'
import type { ScreenSize } from './screen.ts'
import type { ClassName, NodeId, Props, UiDocument } from './types.ts'

// Drawing new elements on the canvas with the toolbar's tools. Plain
// TypeScript, no React. Points and boxes are in game pixels from the
// screen's top-left corner.

type Point = { x: number; y: number }

// Drags shorter than this (in game pixels) count as a click: the element
// gets its default size instead of a tiny one.
export const CLICK_SIZE = 4

function contains(box: Box, point: Point): boolean {
  return (
    point.x >= box.x &&
    point.y >= box.y &&
    point.x <= box.x + box.width &&
    point.y <= box.y + box.height
  )
}

// The container (Frame or ScrollingFrame) a point is inside, the innermost
// one, or the ScreenGui. Later children are drawn on top, so they're
// checked first. Hidden and locked elements are skipped, like clicks skip
// them.
export function containerAt(
  doc: UiDocument,
  point: Point,
  screen: ScreenSize,
): NodeId {
  function search(id: NodeId): NodeId | null {
    const children = doc.nodes[id].children
    for (let i = children.length - 1; i >= 0; i--) {
      const child = doc.nodes[children[i]]
      if (!resolveProps(child).Visible || child.locked) continue
      if (!contains(absoluteBox(doc, child.id, screen), point)) continue
      // Inside this child: look deeper first, then take it if it's a
      // container.
      const deeper = search(child.id)
      if (deeper) return deeper
      if (isContainerClass(child.className)) return child.id
    }
    return null
  }
  return search(doc.rootId) ?? doc.rootId
}

// What drawing makes: an element of `className` in the container under
// `from` (where the drag started), filling `box`, in pixels (Offset), the
// way you drew it. A click (a box smaller than CLICK_SIZE) makes a
// default-size element with its corner at `from`.
export function planDraw(
  doc: UiDocument,
  className: ClassName,
  from: Point,
  box: Box,
  screen: ScreenSize,
): { parentId: NodeId; props: Props } {
  const parentId = containerAt(doc, from, screen)
  const parentBox = absoluteBox(doc, parentId, screen)
  const area = contentArea(doc.nodes[parentId], parentBox)
  // Positions are measured from the corner of the parent's content area.
  const originX = parentBox.x + area.x
  const originY = parentBox.y + area.y

  const isClick = box.width < CLICK_SIZE && box.height < CLICK_SIZE
  const size = isClick
    ? defaultProps(className).Size
    : { xs: 0, xo: Math.round(box.width), ys: 0, yo: Math.round(box.height) }
  const corner = isClick ? from : box
  return {
    parentId,
    props: {
      Position: {
        xs: 0,
        xo: Math.round(corner.x - originX),
        ys: 0,
        yo: Math.round(corner.y - originY),
      },
      Size: size,
    },
  }
}

// The box between where a drag started and where the pointer is now.
// `square`: make it a square (Shift held), as big as the larger side.
export function dragBox(from: Point, to: Point, square = false): Box {
  let width = Math.abs(to.x - from.x)
  let height = Math.abs(to.y - from.y)
  if (square) width = height = Math.max(width, height)
  return {
    x: to.x < from.x ? from.x - width : from.x,
    y: to.y < from.y ? from.y - height : from.y,
    width,
    height,
  }
}
