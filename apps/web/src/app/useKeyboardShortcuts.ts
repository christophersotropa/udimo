import { useEffect } from 'react'
import {
  deleteSelection,
  duplicateSelection,
  nudgeSelection,
} from '../store/commands.ts'
import { useDocumentStore } from '../store/documentStore.ts'

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
