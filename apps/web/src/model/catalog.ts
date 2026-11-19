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
  {
    kind: 'element',
    className: 'Frame',
    group: 'Frequently used',
    hint: 'Container',
  },
  {
    kind: 'element',
    className: 'TextLabel',
    group: 'Frequently used',
    hint: 'Text',
  },
  {
    kind: 'element',
    className: 'TextButton',
    group: 'Frequently used',
    hint: 'Button',
  },
  { kind: 'element', className: 'ImageLabel', group: 'Images', hint: 'Image' },
  {
    kind: 'element',
    className: 'ImageButton',
    group: 'Images',
    hint: 'Button',
  },
  { kind: 'element', className: 'TextBox', group: 'More', hint: 'Text input' },
  {
    kind: 'element',
    className: 'ScrollingFrame',
    group: 'More',
    hint: 'Scrolling container',
  },
  {
    kind: 'modifier',
    className: 'UIListLayout',
    group: 'Layout and style',
    hint: 'Modifier',
  },
  {
    kind: 'modifier',
    className: 'UIGridLayout',
    group: 'Layout and style',
    hint: 'Modifier',
  },
  {
    kind: 'modifier',
    className: 'UICorner',
    group: 'Layout and style',
    hint: 'Modifier',
  },
  {
    kind: 'modifier',
    className: 'UIStroke',
    group: 'Layout and style',
    hint: 'Modifier',
  },
  {
    kind: 'modifier',
    className: 'UIGradient',
    group: 'Layout and style',
    hint: 'Modifier',
  },
  {
    kind: 'modifier',
    className: 'UIPadding',
    group: 'Layout and style',
    hint: 'Modifier',
  },
  {
    kind: 'modifier',
    className: 'UIAspectRatioConstraint',
    group: 'Layout and style',
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
