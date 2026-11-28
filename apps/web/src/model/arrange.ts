import type {
  HorizontalAlignment,
  ItemLineAlignment,
  SortOrder,
  UIFlexAlignment,
  VerticalAlignment,
} from './enums.ts'
import type { ScreenSize } from './screen.ts'
import type { ModifierProps, NodeId, UDim } from './types.ts'

// The layout engine: where UIListLayout, UIGridLayout and UIPageLayout put
// each child.
// Plain functions with no document access (layout.ts feeds them sizes), so
// they're easy to test. Every Box is measured from the corner of the
// parent's content area (see contentArea in layout.ts).

type Box = { x: number; y: number; width: number; height: number }

// What the engine needs to know about each child.
export type LayoutItem = {
  id: NodeId
  name: string
  layoutOrder: number
  width: number // its own size, from Size (a list keeps it; a grid doesn't)
  height: number
  // Its UIFlexItem, if it has one (only a list looks at it).
  flexItem?: Required<ModifierProps['UIFlexItem']>
}

// The order a layout places children in. Array.sort keeps equal items in
// their original (tree) order, so children with the same LayoutOrder stay
// in Explorer order, and reordering in the Explorer reorders them.
export function sortForLayout(
  items: LayoutItem[],
  sortOrder: SortOrder,
): LayoutItem[] {
  if (sortOrder === 'LayoutOrder') {
    return [...items].sort((a, b) => a.layoutOrder - b.layoutOrder)
  }
  if (sortOrder === 'Name') {
    return [...items].sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )
  }
  return items // 'Custom': tree order
}

// Where something of `size` starts along a line of `space`, for each
// alignment: at the start, in the middle, or at the end.
function alignStart(
  alignment: HorizontalAlignment | VerticalAlignment,
  space: number,
  size: number,
): number {
  if (alignment === 'Left' || alignment === 'Top') return 0
  if (alignment === 'Center') return (space - size) / 2
  return space - size // Right or Bottom
}

const udimPixels = (value: UDim, length: number) => value.s * length + value.o

// UIListLayout: children one after another with `Padding` between them,
// in a column (Vertical) or a row (Horizontal), each keeping its own size.
// The whole run is aligned along its direction; each child is aligned
// across it.
//
// Flex (Roblox's version of CSS flexbox) changes that:
// - Wraps: a child that won't fit on the line starts a new one.
// - Along a line (HorizontalFlex in a row, VerticalFlex in a column), the
//   room left over is shared out: Fill grows the children into it (or
//   shrinks them when there's too little), the Space options put it
//   around or between them instead.
// - Across (the other one), Fill stretches the children (and with Wraps,
//   the lines) to fill the list; the Space options space the lines out.
// - ItemLineAlignment, on the list or a child's UIFlexItem, picks where a
//   child sits across its line.
// - A child's UIFlexItem says how that child grows and shrinks.
// With none of it set this is the plain list above: one line, nothing
// grows, so existing designs look the same.
export function arrangeList(
  items: LayoutItem[],
  area: ScreenSize,
  list: Required<ModifierProps['UIListLayout']>,
): Map<NodeId, Box> {
  const vertical = list.FillDirection === 'Vertical'
  // "Along" is the list's direction, "across" the other one.
  const space = vertical ? area.height : area.width
  const crossSpace = vertical ? area.width : area.height
  const gap = udimPixels(list.Padding, space)
  const alongFlex = vertical ? list.VerticalFlex : list.HorizontalFlex
  const acrossFlex = vertical ? list.HorizontalFlex : list.VerticalFlex
  const alongAlignment = vertical
    ? list.VerticalAlignment
    : list.HorizontalAlignment
  const acrossAlignment = vertical
    ? list.HorizontalAlignment
    : list.VerticalAlignment
  const along = (item: LayoutItem) => (vertical ? item.height : item.width)
  const across = (item: LayoutItem) => (vertical ? item.width : item.height)

  const lines = splitLines(
    sortForLayout(items, list.SortOrder),
    along,
    space,
    gap,
    list.Wraps,
  )

  // How thick each line is across. One line (no Wraps) is the whole list,
  // as a plain list aligns its children across all of it; wrapped lines
  // are as thick as their thickest child, then share out the room left.
  let lineSizes: number[]
  let lineStarts: number[]
  if (!list.Wraps) {
    lineSizes = [crossSpace]
    lineStarts = [0]
  } else {
    lineSizes = lines.map((line) => Math.max(0, ...line.map(across)))
    const used = sum(lineSizes) + gap * Math.max(0, lines.length - 1)
    const free = crossSpace - used
    let spread = { start: 0, extra: 0 }
    if (acrossFlex === 'Fill') {
      if (free > 0)
        lineSizes = lineSizes.map((size) => size + free / lines.length)
    } else {
      spread = spreadOut(
        acrossFlex,
        acrossAlignment,
        crossSpace,
        used,
        lines.length,
      )
    }
    lineStarts = []
    let position = spread.start
    for (const size of lineSizes) {
      lineStarts.push(position)
      position += size + gap + spread.extra
    }
  }

  const boxes = new Map<NodeId, Box>()
  lines.forEach((line, l) => {
    const sizes = flexSizes(line, along, space, gap, alongFlex)
    const used = sum(sizes) + gap * (line.length - 1)
    const spread = spreadOut(
      alongFlex,
      alongAlignment,
      space,
      used,
      line.length,
    )
    let position = spread.start
    line.forEach((item, i) => {
      const lineAlign = itemLineAlignment(
        item,
        list,
        acrossFlex,
        acrossAlignment,
      )
      const thickness = lineAlign === 'Stretch' ? lineSizes[l] : across(item)
      const offset =
        lineAlign === 'Center'
          ? (lineSizes[l] - thickness) / 2
          : lineAlign === 'End'
            ? lineSizes[l] - thickness
            : 0
      const acrossAt = lineStarts[l] + offset
      boxes.set(item.id, {
        x: vertical ? acrossAt : position,
        y: vertical ? position : acrossAt,
        width: vertical ? thickness : sizes[i],
        height: vertical ? sizes[i] : thickness,
      })
      position += sizes[i] + gap + spread.extra
    })
  })
  return boxes
}

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0)

// The children split into lines: all on one, or with `wraps` a new line
// whenever the next child would run past the end. A line always takes at
// least one child, even one too big for it.
function splitLines(
  ordered: LayoutItem[],
  along: (item: LayoutItem) => number,
  space: number,
  gap: number,
  wraps: boolean,
): LayoutItem[][] {
  if (!wraps) return ordered.length > 0 ? [ordered] : []
  const lines: LayoutItem[][] = []
  let line: LayoutItem[] = []
  let used = 0
  for (const item of ordered) {
    const needed = line.length === 0 ? along(item) : used + gap + along(item)
    // A hair of slack, so rounding doesn't push an exact fit onto a new line.
    if (line.length > 0 && needed > space + 0.001) {
      lines.push(line)
      line = [item]
      used = along(item)
    } else {
      line.push(item)
      used = needed
    }
  }
  if (line.length > 0) lines.push(line)
  return lines
}

// How much a child grows into spare room and shrinks when there's too
// little, relative to the others on its line. Its UIFlexItem decides (Grow
// 1:0, Shrink 0:1, Fill 1:1, Custom its own ratios); without one, or with
// FlexMode None, the list does: Fill along means 1:1, anything else 0:0.
function flexRatios(
  item: LayoutItem,
  listFlex: UIFlexAlignment,
): { grow: number; shrink: number } {
  switch (item.flexItem?.FlexMode) {
    case 'Grow':
      return { grow: 1, shrink: 0 }
    case 'Shrink':
      return { grow: 0, shrink: 1 }
    case 'Fill':
      return { grow: 1, shrink: 1 }
    case 'Custom':
      return {
        grow: item.flexItem.GrowRatio,
        shrink: item.flexItem.ShrinkRatio,
      }
  }
  return listFlex === 'Fill' ? { grow: 1, shrink: 1 } : { grow: 0, shrink: 0 }
}

// Each child's length along its line. Each starts at its own size; spare
// room goes to the children that grow, in proportion to their grow ratio.
// When the line is too full, the children that shrink give up the
// overflow, the bigger ones more (in proportion to shrink ratio × size,
// as CSS does, so nothing shrinks past nothing).
function flexSizes(
  line: LayoutItem[],
  along: (item: LayoutItem) => number,
  space: number,
  gap: number,
  listFlex: UIFlexAlignment,
): number[] {
  const sizes = line.map(along)
  const free = space - sum(sizes) - gap * (line.length - 1)
  const ratios = line.map((item) => flexRatios(item, listFlex))
  if (free > 0) {
    const total = sum(ratios.map((r) => r.grow))
    if (total > 0)
      return sizes.map((size, i) => size + (free * ratios[i].grow) / total)
  } else if (free < 0) {
    const weights = sizes.map((size, i) => size * ratios[i].shrink)
    const total = sum(weights)
    if (total > 0) {
      return sizes.map((size, i) =>
        Math.max(0, size + (free * weights[i]) / total),
      )
    }
  }
  return sizes
}

// Where a run of `count` things `used` long starts in `space`, and the
// extra gap put between each: the Space options share out what's left
// over (SpaceBetween only between, SpaceAround half a share at each end,
// SpaceEvenly a full share everywhere). Otherwise, or with no room left,
// the run is just aligned.
function spreadOut(
  flex: UIFlexAlignment,
  alignment: HorizontalAlignment | VerticalAlignment,
  space: number,
  used: number,
  count: number,
): { start: number; extra: number } {
  const free = space - used
  if (free > 0 && count > 0) {
    if (flex === 'SpaceBetween') {
      return { start: 0, extra: count > 1 ? free / (count - 1) : 0 }
    }
    if (flex === 'SpaceAround')
      return { start: free / count / 2, extra: free / count }
    if (flex === 'SpaceEvenly') {
      return { start: free / (count + 1), extra: free / (count + 1) }
    }
  }
  return { start: alignStart(alignment, space, used), extra: 0 }
}

// Where a child sits across its line. Its UIFlexItem's ItemLineAlignment
// wins, then the list's. Automatic stretches when the list flexes across,
// and otherwise follows the list's alignment across (Top or Left is the
// start of the line).
function itemLineAlignment(
  item: LayoutItem,
  list: Required<ModifierProps['UIListLayout']>,
  acrossFlex: UIFlexAlignment,
  acrossAlignment: HorizontalAlignment | VerticalAlignment,
): Exclude<ItemLineAlignment, 'Automatic'> {
  const own = item.flexItem?.ItemLineAlignment ?? 'Automatic'
  const chosen = own !== 'Automatic' ? own : list.ItemLineAlignment
  if (chosen !== 'Automatic') return chosen
  if (acrossFlex !== 'None') return 'Stretch'
  if (acrossAlignment === 'Center') return 'Center'
  if (acrossAlignment === 'Right' || acrossAlignment === 'Bottom') return 'End'
  return 'Start'
}

// UIGridLayout: children in equal cells of CellSize, with CellPadding
// between them. Horizontal fills each row left to right, then starts the
// next row (Vertical fills columns). A row holds as many cells as fit, or
// at most FillDirectionMaxCells. The whole grid is then aligned.
export function arrangeGrid(
  items: LayoutItem[],
  area: ScreenSize,
  grid: Required<ModifierProps['UIGridLayout']>,
): Map<NodeId, Box> {
  const cell = {
    width: grid.CellSize.xs * area.width + grid.CellSize.xo,
    height: grid.CellSize.ys * area.height + grid.CellSize.yo,
  }
  const gap = {
    x: grid.CellPadding.xs * area.width + grid.CellPadding.xo,
    y: grid.CellPadding.ys * area.height + grid.CellPadding.yo,
  }
  const ordered = sortForLayout(items, grid.SortOrder)
  const horizontal = grid.FillDirection === 'Horizontal'

  // How many cells fit along the fill direction: n cells fit when
  // n × cell + (n - 1) × gap <= space, so n <= (space + gap) / (cell + gap).
  // Always at least one, even if the cell is bigger than the space.
  const space = horizontal ? area.width : area.height
  const cellLength = horizontal ? cell.width : cell.height
  const gapLength = horizontal ? gap.x : gap.y
  let perLine =
    cellLength + gapLength > 0
      ? Math.floor((space + gapLength) / (cellLength + gapLength))
      : ordered.length
  if (grid.FillDirectionMaxCells > 0) {
    perLine = Math.min(perLine, grid.FillDirectionMaxCells)
  }
  perLine = Math.max(1, perLine)

  const lines = Math.ceil(ordered.length / perLine)
  const firstLine = Math.min(ordered.length, perLine)
  const columns = horizontal ? firstLine : lines
  const rows = horizontal ? lines : firstLine
  const gridWidth = columns * cell.width + Math.max(0, columns - 1) * gap.x
  const gridHeight = rows * cell.height + Math.max(0, rows - 1) * gap.y
  const left = alignStart(grid.HorizontalAlignment, area.width, gridWidth)
  const top = alignStart(grid.VerticalAlignment, area.height, gridHeight)

  const boxes = new Map<NodeId, Box>()
  ordered.forEach((item, i) => {
    const along = i % perLine
    const line = Math.floor(i / perLine)
    const column = horizontal ? along : line
    const row = horizontal ? line : along
    boxes.set(item.id, {
      x: left + column * (cell.width + gap.x),
      y: top + row * (cell.height + gap.y),
      width: cell.width,
      height: cell.height,
    })
  })
  return boxes
}

// UIPageLayout: the children are pages in a row (Horizontal) or a column,
// each keeping its own size, with Padding between them. The page being
// shown (`shownId`, or the first if it isn't one of them) is aligned
// inside the area on both axes; the pages before it continue backwards
// from it, and the ones after it forwards, each aligned across the row.
// (In game a page turn slides the whole row until the new page sits
// where the shown one does.)
export function arrangePages(
  items: LayoutItem[],
  area: ScreenSize,
  page: Required<ModifierProps['UIPageLayout']>,
  shownId?: NodeId,
): Map<NodeId, Box> {
  const vertical = page.FillDirection === 'Vertical'
  const gap = udimPixels(page.Padding, vertical ? area.height : area.width)
  const ordered = sortForLayout(items, page.SortOrder)
  const shown = Math.max(
    0,
    ordered.findIndex((item) => item.id === shownId),
  )

  const along = (item: LayoutItem) => (vertical ? item.height : item.width)
  // Where each page starts along the row: the shown one by its alignment,
  // the rest from their neighbour towards it.
  const starts: number[] = []
  if (ordered.length > 0) {
    starts[shown] = vertical
      ? alignStart(page.VerticalAlignment, area.height, ordered[shown].height)
      : alignStart(page.HorizontalAlignment, area.width, ordered[shown].width)
  }
  for (let i = shown + 1; i < ordered.length; i++) {
    starts[i] = starts[i - 1] + along(ordered[i - 1]) + gap
  }
  for (let i = shown - 1; i >= 0; i--) {
    starts[i] = starts[i + 1] - gap - along(ordered[i])
  }

  const boxes = new Map<NodeId, Box>()
  ordered.forEach((item, i) => {
    const across = vertical
      ? alignStart(page.HorizontalAlignment, area.width, item.width)
      : alignStart(page.VerticalAlignment, area.height, item.height)
    boxes.set(item.id, {
      x: vertical ? across : starts[i],
      y: vertical ? starts[i] : across,
      width: item.width,
      height: item.height,
    })
  })
  return boxes
}
