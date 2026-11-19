import { useEffect } from 'react'
import type { NodeId, UiDocument } from '../model/types.ts'
import {
  copySelection,
  cutSelection,
  deleteSelection,
  duplicateSelection,
  nudgeSelection,
  pasteFragment,
  wrapSelectionInFrame,
} from '../store/commands.ts'
import { useDocumentStore } from '../store/documentStore.ts'

// What Copy or Cut last took. It lives here, in memory, not in the store:
// it isn't part of the document and isn't undone. It's lost on refresh,
// and it doesn't reach other tabs or apps.
let clipboard: UiDocument | null = null
// The copies the last paste made, so pasting again goes beside them.
let lastPasted: NodeId[] = []

// Arrow key -> direction. Shift makes each step bigger.
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}
const NUDGE_SMALL = 1
const NUDGE_BIG = 10

// Keyboard shortcuts for the whole editor:
//   Undo           Cmd+Z / Ctrl+Z
//   Redo           Cmd+Shift+Z / Ctrl+Shift+Z / Ctrl+Y
//   Duplicate      Cmd+D / Ctrl+D
//   Copy/Cut/Paste Cmd+C / Cmd+X / Cmd+V (Ctrl on Windows)
//   Wrap in Frame  Cmd+G / Ctrl+G
//   Delete         Delete or Backspace
//   Nudge          Arrow keys (1 px), Shift + arrows (10 px)
//   Deselect       Escape
// Inside a text box they're all left alone, so typing works normally.
export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable="true"]')) return

      const store = useDocumentStore
      // metaKey is Cmd on a Mac; ctrlKey is Ctrl everywhere.
      const command = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      // preventDefault() stops the browser's own meaning for the key:
      // Cmd+D would add a bookmark, arrows would scroll the page,
      // Cmd+Z would run the browser's undo.
      if (command && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        store.getState().undo()
      } else if (command && ((key === 'z' && event.shiftKey) || key === 'y')) {
        event.preventDefault()
        store.getState().redo()
      } else if (command && key === 'd') {
        event.preventDefault()
        duplicateSelection(store)
      } else if (command && (key === 'c' || key === 'x')) {
        // With nothing selected, leave the key to the browser (and keep
        // whatever was copied before).
        const fragment =
          key === 'c' ? copySelection(store) : cutSelection(store)
        if (fragment) {
          event.preventDefault()
          clipboard = fragment
          lastPasted = []
        }
      } else if (command && key === 'v') {
        if (!clipboard) return
        event.preventDefault()
        lastPasted = pasteFragment(store, clipboard, lastPasted)
      } else if (command && key === 'g') {
        // Cmd+G is the browser's "find next"; here it wraps in a Frame.
        event.preventDefault()
        wrapSelectionInFrame(store)
      } else if (!command && (key === 'delete' || key === 'backspace')) {
        event.preventDefault()
        deleteSelection(store)
      } else if (!command && event.key in ARROWS) {
        if (store.getState().selection.length === 0) return // let the page scroll
        event.preventDefault()
        const [x, y] = ARROWS[event.key]
        const step = event.shiftKey ? NUDGE_BIG : NUDGE_SMALL
        nudgeSelection(store, x * step, y * step)
      } else if (key === 'escape') {
        store.getState().clearSelection()
      }
    }

    // useEffect runs after the first render; the function it returns runs
    // when the component goes away, so the listener never piles up.
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
