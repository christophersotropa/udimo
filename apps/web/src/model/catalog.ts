import type { ElementClassName } from '../store/documentStore.ts'
import type { ModifierClass } from './types.ts'

// Everything "Insert Object" offers: the element classes and the
// modifiers, grouped the way the menu shows them. Plain data, no React.

export type CatalogEntry =
  | {
      kind: 'element'
      className: ElementClassName
      group: string
      hint: string
    }
  | { kind: 'modifier'; className: ModifierClass; group: string; hint: string }

export const CATALOG: CatalogEntry[] = [
  { kind: 'element', className: 'Frame', group: 'Common', hint: 'Container' },
  { kind: 'element', className: 'TextLabel', group: 'Common', hint: 'Text' },
  { kind: 'element', className: 'TextButton', group: 'Common', hint: 'Button' },
  {
    kind: 'element',
    className: 'TextBox',
    group: 'Common',
    hint: 'Text input',
  },
  { kind: 'element', className: 'ImageLabel', group: 'Common', hint: 'Image' },
  {
    kind: 'element',
    className: 'ImageButton',
    group: 'Common',
    hint: 'Button',
  },
  {
    kind: 'element',
    className: 'ScrollingFrame',
    group: 'Common',
    hint: 'Scrolling container',
  },
  {
    kind: 'modifier',
    className: 'UIListLayout',
    group: 'Layout',
    hint: 'Modifier',
  },
  {
    kind: 'modifier',
    className: 'UIGridLayout',
    group: 'Layout',
    hint: 'Modifier',
  },
  {
    kind: 'modifier',
    className: 'UIPadding',
    group: 'Layout',
    hint: 'Modifier',
  },
  {
    kind: 'modifier',
    className: 'UIAspectRatioConstraint',
    group: 'Layout',
    hint: 'Modifier',
  },
  { kind: 'modifier', className: 'UICorner', group: 'Style', hint: 'Modifier' },
  { kind: 'modifier', className: 'UIStroke', group: 'Style', hint: 'Modifier' },
  {
    kind: 'modifier',
    className: 'UIGradient',
    group: 'Style',
    hint: 'Modifier',
  },
]

// The entries matching what was typed in the search box: any part of the
// class name, ignoring capitals ("corner" finds UICorner). An empty search
// matches everything. `withModifiers` false leaves modifiers out (the
// ScreenGui can't have any).
export function searchCatalog(
  query: string,
  withModifiers = true,
): CatalogEntry[] {
  const words = query.trim().toLowerCase()
  return CATALOG.filter(
    (entry) =>
      (withModifiers || entry.kind === 'element') &&
      entry.className.toLowerCase().includes(words),
  )
}
