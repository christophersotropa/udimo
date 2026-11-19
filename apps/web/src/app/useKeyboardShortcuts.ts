import { useEffect } from 'react'
import { copyToClipboard, pasteFromClipboard } from '../store/clipboard.ts'
import {
  deleteSelection,
  duplicateSelection,
  nudgeSelection,
  wrapSelectionInFrame,
} from '../store/commands.ts'
import { useDocumentStore } from '../store/documentStore.ts'
import { screenOf, type Tool, useViewStore } from '../store/viewStore.ts'

// Arrow key -> direction. Shift makes each step bigger.
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}
// Single keys that pick a tool.
const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  f: 'frame',
  t: 'text',
  b: 'button',
  i: 'image',
  h: 'hand',
}
const NUDGE_SMALL = 1
const NUDGE_BIG = 10

// Keyboard shortcuts for the whole editor:
//   Undo           Cmd+Z / Ctrl+Z
//   Redo           Cmd+Shift+Z / Ctrl+Shift+Z / Ctrl+Y
//   Duplicate      Cmd+D / Ctrl+D
//   Copy/Cut/Paste Cmd+C / Cmd+X / Cmd+V (Ctrl on Windows)
//   Paste Into     Cmd+Shift+V: inside the one selected element
//   Rename         F2
//   Wrap in Frame  Cmd+G / Ctrl+G
//   Zoom           Cmd+= / Cmd+- (Ctrl on Windows), Cmd+0 to fit
//   Delete         Delete or Backspace
//   Nudge          Arrow keys (1 px), Shift + arrows (10 px)
//   Tools          V select, F frame, T text, B button, I image, H hand
//   Deselect       Escape
// Inside a text box they're all left alone, so typing works normally.
export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable="true"]')) return
      // Menus and dialogs handle their own keys (arrows move through a
      // menu there, not your selection on the canvas).
      if (target.closest('[role="menu"], dialog')) return

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
        if (copyToClipboard(store, key === 'x')) event.preventDefault()
      } else if (command && key === 'v') {
        // Shift: "Paste Into" the one selected element.
        const { selection } = store.getState()
        const into =
          event.shiftKey && selection.length === 1 ? selection[0] : undefined
        if (pasteFromClipboard(store, into)) event.preventDefault()
      } else if (command && key === 'g') {
        // Cmd+G is the browser's "find next"; here it wraps in a Frame.
        event.preventDefault()
        // Wrap keeps things in place on the screen you're looking at.
        wrapSelectionInFrame(store, screenOf(useViewStore.getState()))
      } else if (command && (key === '=' || key === '+' || key === '-')) {
        // Without preventDefault these would zoom the whole web page.
        event.preventDefault()
        useViewStore.getState().zoomBy(key === '-' ? 1 / 1.25 : 1.25)
      } else if (command && key === '0') {
        event.preventDefault()
        useViewStore.getState().fit()
      } else if (!command && (key === 'delete' || key === 'backspace')) {
        event.preventDefault()
        deleteSelection(store)
      } else if (!command && event.key in ARROWS) {
        if (store.getState().selection.length === 0) return // let the page scroll
        event.preventDefault()
        const [x, y] = ARROWS[event.key]
        const step = event.shiftKey ? NUDGE_BIG : NUDGE_SMALL
        nudgeSelection(store, x * step, y * step)
      } else if (!command && !event.shiftKey && Object.hasOwn(TOOL_KEYS, key)) {
        useViewStore.getState().setTool(TOOL_KEYS[key])
      } else if (key === 'f2') {
        const { selection } = store.getState()
        if (selection.length === 1) {
          event.preventDefault()
          useViewStore.getState().setRenamingId(selection[0])
        }
      } else if (
        key === 'escape' &&
        useViewStore.getState().tool !== 'select'
      ) {
        // Escape first puts down a tool, then (pressed again) deselects.
        useViewStore.getState().setTool('select')
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
