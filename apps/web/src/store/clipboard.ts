import type { NodeId, UiDocument } from '../model/types.ts'
import { copySelection, cutSelection, pasteFragment } from './commands.ts'
import type { DocumentStore } from './documentStore.ts'

// The editor's clipboard: what Copy or Cut last took. It's kept in memory,
// not in the document store: it isn't part of the document and isn't
// undone. It's lost on refresh and doesn't reach other tabs or apps.
// Shortcuts and right-click menus both use it, so it lives here.

let fragment: UiDocument | null = null
// The copies the last paste made, so pasting again goes beside them.
let lastPasted: NodeId[] = []

export function hasClipboard(): boolean {
  return fragment !== null
}

// Copy or Cut the selection. Returns false (keeping the old clipboard)
// when nothing is selected.
export function copyToClipboard(store: DocumentStore, cut = false): boolean {
  const taken = cut ? cutSelection(store) : copySelection(store)
  if (!taken) return false
  fragment = taken
  lastPasted = []
  return true
}

// Paste where the paste rules say, or inside `into` ("Paste Into").
export function pasteFromClipboard(
  store: DocumentStore,
  into?: NodeId,
): boolean {
  if (!fragment) return false
  lastPasted = pasteFragment(store, fragment, into ? [] : lastPasted, into)
  return true
}

// For tests: start empty.
export function clearClipboard() {
  fragment = null
  lastPasted = []
}
