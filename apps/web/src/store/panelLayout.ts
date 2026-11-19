// The side panels' layout, like Roblox Studio's docking: each side of the
// canvas holds the panels docked there, top to bottom. A side with no
// panels disappears and the canvas takes its room; a side with two splits
// its height between them. You change it by dragging (a panel's title bar,
// its inner edge, the line between two stacked panels), and it's kept in
// localStorage so it's the same next visit. It's editor state, not part of
// the document: never undone, saved or exported.

export type PanelId = 'explorer' | 'properties'
export type Side = 'left' | 'right'

export const PANEL_IDS: readonly PanelId[] = ['explorer', 'properties']

export type PanelLayout = {
  // The panels docked on each side, top to bottom. Each panel is on
  // exactly one side.
  left: PanelId[]
  right: PanelId[]
  widths: Record<Side, number> // each side's width in pixels
  // When two panels share a side: the top one's share of the height.
  split: number
}

export const DEFAULT_PANEL_LAYOUT: PanelLayout = {
  left: ['explorer'],
  right: ['properties'],
  widths: { left: 240, right: 280 },
  split: 0.5,
}

// Narrower and the property boxes get too small to type in; wider and the
// canvas gets squeezed.
export const PANEL_MIN_WIDTH = 220
export const PANEL_MAX_WIDTH = 480
// Neither stacked panel gets less than a fifth of the height.
export const SPLIT_MIN = 0.2
export const SPLIT_MAX = 0.8

export const PANEL_LAYOUT_KEY = 'udimo:panels'

type Point = { x: number; y: number }
type Size = { width: number; height: number }
export type Rect = Point & Size

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

// A width kept between the limits, in whole pixels.
export function clampPanelWidth(width: number): number {
  return Math.round(clamp(width, PANEL_MIN_WIDTH, PANEL_MAX_WIDTH))
}

export function clampSplit(split: number): number {
  return clamp(split, SPLIT_MIN, SPLIT_MAX)
}

export function sideOf(layout: PanelLayout, id: PanelId): Side {
  return layout.left.includes(id) ? 'left' : 'right'
}

// A side's width after dragging its inner edge (the one next to the
// canvas) `dx` pixels to the right: wider on the left, narrower on the
// right.
export function draggedWidth(
  startWidth: number,
  dx: number,
  side: Side,
): number {
  return clampPanelWidth(side === 'left' ? startWidth + dx : startWidth - dx)
}

// ---------- Moving panels ----------

// Where a dragged panel would dock: a side, and its place there (0 = top).
export type DropSpot = { side: Side; index: number }

// The spot under the pointer, given the workspace's rectangle (the area
// between the top bar and the status bar). The window's left half docks
// on the left, the right half on the right. If another panel is already
// there, the pointer's height picks above it (top half) or below it.
export function dropSpot(
  layout: PanelLayout,
  id: PanelId,
  point: Point,
  area: Rect,
): DropSpot {
  const side: Side = point.x < area.x + area.width / 2 ? 'left' : 'right'
  const others = layout[side].filter((other) => other !== id)
  const below = others.length > 0 && point.y >= area.y + area.height / 2
  return { side, index: below ? others.length : 0 }
}

// The layout with a panel moved to a spot.
export function movePanel(
  layout: PanelLayout,
  id: PanelId,
  spot: DropSpot,
): PanelLayout {
  const left = layout.left.filter((other) => other !== id)
  const right = layout.right.filter((other) => other !== id)
  const target = spot.side === 'left' ? left : right
  target.splice(Math.min(spot.index, target.length), 0, id)
  return { ...layout, left, right }
}

// Whether moving the panel there would change nothing.
export function isSamePlace(
  layout: PanelLayout,
  id: PanelId,
  spot: DropSpot,
): boolean {
  const moved = movePanel(layout, id, spot)
  return (
    moved.left.join() === layout.left.join() &&
    moved.right.join() === layout.right.join()
  )
}

// Everything flipped left to right; each side keeps its width.
export function mirrored(layout: PanelLayout): PanelLayout {
  return {
    ...layout,
    left: layout.right,
    right: layout.left,
    widths: { left: layout.widths.right, right: layout.widths.left },
  }
}

// ---------- Where things go on screen ----------

// The workspace is a CSS grid: [left side] canvas [right side], with two
// rows so a side's panels can stack. These give its columns and rows, and
// each panel's cell.

export function gridColumns(layout: PanelLayout): string {
  return [
    layout.left.length > 0 ? `${layout.widths.left}px` : null,
    'minmax(0, 1fr)',
    layout.right.length > 0 ? `${layout.widths.right}px` : null,
  ]
    .filter(Boolean)
    .join(' ')
}

export function gridRows(layout: PanelLayout): string {
  return `minmax(0, ${layout.split}fr) minmax(0, ${1 - layout.split}fr)`
}

// The canvas's column: the first, unless the left side has panels.
export function canvasColumn(layout: PanelLayout): number {
  return layout.left.length > 0 ? 2 : 1
}

// A panel's grid cell, as CSS grid-column and grid-row values. A panel
// alone on its side spans both rows ("1 / 3": from line 1 to line 3).
export function panelCell(
  layout: PanelLayout,
  id: PanelId,
): { gridColumn: number; gridRow: string } {
  const side = sideOf(layout, id)
  const stack = layout[side]
  return {
    gridColumn: side === 'left' ? 1 : canvasColumn(layout) + 1,
    gridRow: stack.length === 1 ? '1 / 3' : String(stack.indexOf(id) + 1),
  }
}

// A panel's rectangle within a workspace of `area` size: for drawing
// where a dragged panel would land.
export function panelRect(layout: PanelLayout, id: PanelId, area: Size): Rect {
  const side = sideOf(layout, id)
  const width = layout.widths[side]
  const x = side === 'left' ? 0 : area.width - width
  const stack = layout[side]
  if (stack.length === 1) return { x, y: 0, width, height: area.height }
  const topHeight = area.height * layout.split
  return stack.indexOf(id) === 0
    ? { x, y: 0, width, height: topHeight }
    : { x, y: topHeight, width, height: area.height - topHeight }
}

// ---------- Saving it in the browser ----------

const isPanelList = (v: unknown): v is PanelId[] =>
  Array.isArray(v) &&
  v.every((id) => typeof id === 'string' && PANEL_IDS.includes(id as PanelId))
const isNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

// The saved layout, or the default if there's none or it's broken. (A bad
// value must never stop the editor from opening.)
export function loadPanelLayout(
  storage: Pick<Storage, 'getItem'>,
): PanelLayout {
  try {
    const data: unknown = JSON.parse(storage.getItem(PANEL_LAYOUT_KEY) ?? '')
    if (typeof data !== 'object' || data === null) throw new Error()
    const { left, right, widths, split } = data as Record<string, unknown>
    if (!isPanelList(left) || !isPanelList(right) || !isNumber(split)) {
      throw new Error()
    }
    // Every panel exactly once.
    const all = [...left, ...right]
    if (all.length !== PANEL_IDS.length || new Set(all).size !== all.length) {
      throw new Error()
    }
    if (typeof widths !== 'object' || widths === null) throw new Error()
    const { left: leftWidth, right: rightWidth } = widths as Record<
      string,
      unknown
    >
    if (!isNumber(leftWidth) || !isNumber(rightWidth)) throw new Error()
    return {
      left,
      right,
      widths: {
        left: clampPanelWidth(leftWidth),
        right: clampPanelWidth(rightWidth),
      },
      split: clampSplit(split),
    }
  } catch {
    return DEFAULT_PANEL_LAYOUT
  }
}

export function savePanelLayout(
  storage: Pick<Storage, 'setItem'>,
  layout: PanelLayout,
): void {
  try {
    storage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(layout))
  } catch {
    // Storage full or blocked: the layout just won't be remembered.
  }
}
