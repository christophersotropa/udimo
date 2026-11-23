import { resolveProps } from './defaults.ts'
import { absoluteBox, boxInParent, contentArea } from './layout.ts'
import type { ScreenSize } from './screen.ts'
import { inTreeOrder, topLevelNodes } from './tree.ts'
import type { NodeId, Props, UDim2, UiDocument } from './types.ts'

// "Wrap in Frame": put the selected elements inside a new, invisible Frame
// that fits snugly around them, without anything moving on screen.
// Plain TypeScript, no React.
//
// The tricky part: Scale is a fraction of the *parent*. Once an element moves
// into the new Frame, its parent is smaller, so its numbers must change to
// keep it in the same place. Each axis keeps the units the element used:
// Scale stays Scale (now relative to the Frame), Offset stays Offset.

export type WrapPlan = {
  parentId: NodeId // where the new Frame goes
  index: number // its place among the parent's children
  frameProps: Props
  // The wrapped elements, top to bottom, with their new Position and Size.
  children: { id: NodeId; props: Pick<Props, 'Position' | 'Size'> }[]
}

// One axis of a Position. `frameStart` is where the Frame begins inside the
// old parent, in pixels.
function moveAxis(
  scale: number,
  offset: number,
  parentLength: number,
  frameStart: number,
  frameLength: number,
): [number, number] {
  // Scale: the same pixel spot, as a fraction of the Frame instead.
  if (scale !== 0) {
    return [(scale * parentLength - frameStart) / frameLength, offset]
  }
  // Offset only: just measure from the Frame's corner instead.
  return [0, offset - frameStart]
}

function movePosition(
  position: UDim2,
  parent: ScreenSize,
  frame: { x: number; y: number; width: number; height: number },
): UDim2 {
  const [xs, xo] = moveAxis(
    position.xs,
    position.xo,
    parent.width,
    frame.x,
    frame.width,
  )
  const [ys, yo] = moveAxis(
    position.ys,
    position.yo,
    parent.height,
    frame.y,
    frame.height,
  )
  return { xs, xo, ys, yo }
}

// Size never depends on where the Frame is, only on how big it is.
function resizeForFrame(
  size: UDim2,
  parent: ScreenSize,
  frame: ScreenSize,
): UDim2 {
  return {
    xs: (size.xs * parent.width) / frame.width,
    xo: size.xo,
    ys: (size.ys * parent.height) / frame.height,
    yo: size.yo,
  }
}

// What wrapping the selection would do, or null if it can't be wrapped:
// nothing selected, elements with different parents, or a parent with a
// layout.
export function planWrap(
  doc: UiDocument,
  selection: NodeId[],
  screen: ScreenSize,
): WrapPlan | null {
  const ids = inTreeOrder(doc, topLevelNodes(doc, selection))
  if (ids.length === 0) return null
  const parentId = doc.nodes[ids[0]].parentId
  if (parentId === null) return null
  if (ids.some((id) => doc.nodes[id].parentId !== parentId)) return null
  // Inside a UIListLayout or UIGridLayout, the layout would move the new
  // Frame, so "nothing moves on screen" can't be kept. Not supported (yet).
  const { modifiers } = doc.nodes[parentId]
  if (modifiers?.UIListLayout || modifiers?.UIGridLayout) return null

  // The area the elements are laid out in now: the parent, its scrollable
  // canvas, minus padding (see contentArea). Positions here are measured
  // from that area's corner, and the new Frame sits in the same area, so
  // they stay consistent. At least 1 pixel, so nothing divides by 0.
  const parentBox = contentArea(
    doc.nodes[parentId],
    absoluteBox(doc, parentId, screen),
    doc,
  )
  const parent = {
    width: Math.max(1, parentBox.width),
    height: Math.max(1, parentBox.height),
  }

  // The box around all the elements, widened to whole pixels, because
  // Roblox Offsets are whole pixels.
  const boxes = ids.map((id) => boxInParent(doc.nodes[id], parent, doc))
  const left = Math.floor(Math.min(...boxes.map((b) => b.x)))
  const top = Math.floor(Math.min(...boxes.map((b) => b.y)))
  const right = Math.ceil(Math.max(...boxes.map((b) => b.x + b.width)))
  const bottom = Math.ceil(Math.max(...boxes.map((b) => b.y + b.height)))
  const frame = {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  }

  // If anything wrapped uses Scale, it's meant to grow with the screen, so
  // the Frame uses Scale too. Otherwise plain pixels.
  const props = ids.map((id) => resolveProps(doc.nodes[id]))
  const usesScale = props.some(
    (p) => p.Size.xs || p.Size.ys || p.Position.xs || p.Position.ys,
  )
  const frameProps: Props = {
    Position: usesScale
      ? {
          xs: frame.x / parent.width,
          xo: 0,
          ys: frame.y / parent.height,
          yo: 0,
        }
      : { xs: 0, xo: frame.x, ys: 0, yo: frame.y },
    Size: usesScale
      ? {
          xs: frame.width / parent.width,
          xo: 0,
          ys: frame.height / parent.height,
          yo: 0,
        }
      : { xs: 0, xo: frame.width, ys: 0, yo: frame.height },
    // Invisible, so wrapping changes nothing you can see.
    BackgroundTransparency: 1,
    // Siblings are drawn in ZIndex order, so the Frame takes the highest
    // ZIndex of what it wraps, to stay above whatever they were above.
    ZIndex: Math.max(...props.map((p) => p.ZIndex)),
  }

  return {
    parentId,
    // ids are in tree order, so ids[0] is the earliest: the Frame takes its
    // place in the list.
    index: doc.nodes[parentId].children.indexOf(ids[0]),
    frameProps,
    children: ids.map((id, i) => ({
      id,
      props: {
        Position: movePosition(props[i].Position, parent, frame),
        Size: resizeForFrame(props[i].Size, parent, frame),
      },
    })),
  }
}
