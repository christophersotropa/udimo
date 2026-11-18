import { useEffect } from 'react'
import { useDocumentStore } from '../store/documentStore.ts'

// Keyboard shortcuts for undo and redo, for the whole editor:
//   Undo: Cmd+Z (Mac) or Ctrl+Z (Windows)
//   Redo: Cmd+Shift+Z, Ctrl+Shift+Z or Ctrl+Y
// Inside a text box they're left alone, so the box's own typing undo works.
export function useUndoShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable="true"]')) return

      // metaKey is Cmd on a Mac; ctrlKey is Ctrl everywhere.
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      const { undo, redo } = useDocumentStore.getState()

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault() // stop the browser doing its own undo
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    // useEffect runs after the first render; the function it returns runs
    // when the component goes away, so the listener never piles up.
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
