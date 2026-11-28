import type {
  HorizontalAlignment,
  SortOrder,
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
// in a column (Vertical) or a row (Horizontal). Each keeps its own size.
// The whole run is aligned along its direction; each child is aligned
// across it.
export function arrangeList(
  items: LayoutItem[],
  area: ScreenSize,
  list: Required<ModifierProps['UIListLayout']>,
): Map<NodeId, Box> {
  const vertical = list.FillDirection === 'Vertical'
  const gap = udimPixels(list.Padding, vertical ? area.height : area.width)
  const ordered = sortForLayout(items, list.SortOrder)

  const along = (item: LayoutItem) => (vertical ? item.height : item.width)
  const total =
    ordered.reduce((sum, item) => sum + along(item), 0) +
    gap * Math.max(0, ordered.length - 1)
  let position = vertical
    ? alignStart(list.VerticalAlignment, area.height, total)
    : alignStart(list.HorizontalAlignment, area.width, total)

  const boxes = new Map<NodeId, Box>()
  for (const item of ordered) {
    const across = vertical
      ? alignStart(list.HorizontalAlignment, area.width, item.width)
      : alignStart(list.VerticalAlignment, area.height, item.height)
    boxes.set(item.id, {
      x: vertical ? across : position,
      y: vertical ? position : across,
      width: item.width,
      height: item.height,
    })
    position += along(item) + gap
  }
  return boxes
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
