import { parseProject, serializeProject } from '../model/project.ts'
import type { UiDocument } from '../model/types.ts'
import type { DocumentStore } from './documentStore.ts'

// Autosave: keeps a copy of the document in the browser's localStorage, so
// a refresh or a closed tab doesn't lose your work.
//
// localStorage is a small key-value store (about 5 MB) that each website gets
// in the browser. It only holds text, so the document is saved as a project
// file (see model/project.ts). It stays on this computer and this browser.

export const AUTOSAVE_KEY = 'udimo:autosave'

// Wait this long after the last edit before saving. Dragging makes dozens of
// edits a second; saving once when you pause is plenty.
const SAVE_DELAY_MS = 500

// The parts of localStorage we use. Tests pass in a simple fake instead.
type ReadStorage = Pick<Storage, 'getItem'>
type WriteStorage = Pick<Storage, 'setItem'>

// The browser's localStorage, or null if the browser blocks it (some do
// when cookies are turned off, and then even reading it throws).
export function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// The autosaved document, or null if there isn't one or it can't be read.
export function loadAutosave(storage: ReadStorage): UiDocument | null {
  try {
    const text = storage.getItem(AUTOSAVE_KEY)
    return text === null ? null : parseProject(text)
  } catch (error) {
    // A broken autosave must never stop the editor from opening.
    console.warn('Udimo: ignoring an autosave that could not be read.', error)
    return null
  }
}

// Saves the document a moment after each change. Returns a function that
// stops autosaving (and saves anything still waiting).
export function startAutosave(
  store: DocumentStore,
  storage: WriteStorage,
  delayMs = SAVE_DELAY_MS,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  function save() {
    timer = undefined
    try {
      storage.setItem(AUTOSAVE_KEY, serializeProject(store.getState().document))
    } catch (error) {
      // The storage is full or blocked. Keep editing; just say so.
      console.warn('Udimo: autosave failed.', error)
    }
  }

  // Saves right now if a save is waiting.
  function flush() {
    if (timer === undefined) return
    clearTimeout(timer)
    save()
  }

  // subscribe() calls us after every store change. Selection changes don't
  // touch the document, so they don't trigger a save.
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.document === previous.document) return
    // Restart the wait on every edit: this is called debouncing.
    clearTimeout(timer)
    timer = setTimeout(save, delayMs)
  })

  // pagehide fires when the tab is closed or refreshed, so an edit made in
  // the last half second is still saved. (?. skips this outside a browser,
  // e.g. in tests.)
  globalThis.addEventListener?.('pagehide', flush)

  return () => {
    unsubscribe()
    globalThis.removeEventListener?.('pagehide', flush)
    flush()
  }
}
