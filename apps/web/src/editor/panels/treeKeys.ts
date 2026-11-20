import type { ModifierClass, NodeId } from '../../model/types.ts'

// The Explorer's keyboard controls, worked out without React or the page,
// so they can be tested on their own. ExplorerPanel reads the lines that
// are showing, asks treeKeyAction what a key does, and carries it out.
//
// The keys follow the usual pattern for trees on the web (the WAI-ARIA
// "tree view" pattern), which is also how Studio's Explorer behaves:
//   Up / Down      the line above / below
//   Right          unfold a folded line; on an open one, step into it
//   Left           fold an open line; on a folded or empty one, go to its parent
//   Home / End     the first / last line
//   Space          select the current line
//   Menu key, or Shift+F10: its right-click menu

// One line of the tree as it's showing, top to bottom.
export type TreeLine = {
  level: number // 1 for the ScreenGui, 2 for what's in it, ...
  // Whether it's unfolded; null if it has nothing inside to fold.
  expanded: boolean | null
}

export type TreeKeyAction =
  | { kind: 'focus'; index: number } // move to this line (and select it)
  | { kind: 'expand'; index: number }
  | { kind: 'collapse'; index: number }
  | { kind: 'select'; index: number }
  | { kind: 'menu'; index: number }
  // The key belongs to the tree but has nothing to do here (Right on a line
  // with nothing inside). It's still kept from the rest of the editor, or
  // an arrow would nudge the element on the canvas instead.
  | { kind: 'none' }

// What a key press does, from the lines showing and the index of the
// current one (-1 if it isn't showing, say, filtered out). null: not a
// tree key, so the editor's own shortcuts get it (Delete, F2, ⌘C...).
export function treeKeyAction(
  lines: readonly TreeLine[],
  current: number,
  key: string,
  shiftKey = false,
): TreeKeyAction | null {
  const isTreeKey =
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'Home' ||
    key === 'End' ||
    key === ' ' ||
    key === 'ContextMenu' ||
    (key === 'F10' && shiftKey)
  if (!isTreeKey) return null
  if (lines.length === 0) return { kind: 'none' }

  const last = lines.length - 1
  // With no current line, any key starts at the top.
  if (current < 0 || current > last) return { kind: 'focus', index: 0 }
  const line = lines[current]

  switch (key) {
    case 'ArrowDown':
      return { kind: 'focus', index: Math.min(current + 1, last) }
    case 'ArrowUp':
      return { kind: 'focus', index: Math.max(current - 1, 0) }
    case 'Home':
      return { kind: 'focus', index: 0 }
    case 'End':
      return { kind: 'focus', index: last }
    case ' ':
      return { kind: 'select', index: current }
    case 'ArrowRight':
      if (line.expanded === false) return { kind: 'expand', index: current }
      // Unfolded: the next line is its first child (if it has any showing).
      if (line.expanded && lines[current + 1]?.level > line.level) {
        return { kind: 'focus', index: current + 1 }
      }
      return { kind: 'none' }
    case 'ArrowLeft': {
      if (line.expanded) return { kind: 'collapse', index: current }
      const parent = parentIndex(lines, current)
      return parent === -1 ? { kind: 'none' } : { kind: 'focus', index: parent }
    }
    default: // the menu keys
      return { kind: 'menu', index: current }
  }
}

// The closest line above that's one level out: the line's parent. -1 for
// the top line.
function parentIndex(lines: readonly TreeLine[], index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    if (lines[i].level < lines[index].level) return i
  }
  return -1
}

// The line the keyboard is on: an element, or one of an element's
// modifiers (which are lines of their own in the Explorer).
export type ActiveLine = { id: NodeId; modifier?: ModifierClass }

// Which line is current, given the one the keyboard (or a click) last
// went to and the selection. Clicking an element on the canvas changes
// the selection without touching the Explorer, so the current line follows
// the selection whenever it no longer agrees with it.
export function followSelection(
  last: ActiveLine | null,
  selection: readonly NodeId[],
  rootId: NodeId,
): ActiveLine {
  if (last) {
    // A modifier line goes with its element: it's current while that is
    // selected. The ScreenGui can't be selected, so it's current while
    // nothing is.
    const agrees =
      last.id === rootId ? selection.length === 0 : selection.includes(last.id)
    if (agrees) return last
  }
  return { id: selection.at(-1) ?? rootId }
}

// The page id of a line's element, for aria-activedescendant. Node ids
// are UUIDs, but a hand-edited project file could hold any text, and a
// page id can't contain spaces, so it's encoded.
export function lineDomId(line: ActiveLine): string {
  const id = encodeURIComponent(line.id)
  return line.modifier
    ? `explorer-line-${id}-${line.modifier}`
    : `explorer-line-${id}`
}
