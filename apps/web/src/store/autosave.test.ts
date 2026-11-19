import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { serializeProject } from '../model/project.ts'
import { AUTOSAVE_KEY, loadAutosave, startAutosave } from './autosave.ts'
import { createDocumentStore } from './documentStore.ts'

// A pretend localStorage that keeps everything in a Map.
function fakeStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value)
    }),
  }
}

// Fake timers let a test jump time forward instead of really waiting.
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('loadAutosave', () => {
  it('returns null when nothing was saved', () => {
    expect(loadAutosave(fakeStorage())).toBeNull()
  })

  it('returns the saved document', () => {
    const store = createDocumentStore()
    store.getState().addNode(store.getState().document.rootId, 'Frame')
    const storage = fakeStorage()
    storage.data.set(AUTOSAVE_KEY, serializeProject(store.getState().document))

    expect(loadAutosave(storage)).toEqual(store.getState().document)
  })

  it('returns null, without throwing, for a broken save', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const storage = fakeStorage()
    storage.data.set(AUTOSAVE_KEY, '{ cut off')

    expect(loadAutosave(storage)).toBeNull()
    expect(warn).toHaveBeenCalled()
  })
})

describe('startAutosave', () => {
  function setup() {
    const store = createDocumentStore()
    const storage = fakeStorage()
    const stop = startAutosave(store, storage, 500)
    const rootId = store.getState().document.rootId
    return { store, storage, stop, rootId }
  }

  it('saves once, a moment after the last edit', () => {
    const { store, storage, rootId } = setup()
    store.getState().addNode(rootId, 'Frame')
    vi.advanceTimersByTime(300)
    store.getState().addNode(rootId, 'Frame') // restarts the wait
    vi.advanceTimersByTime(300)
    expect(storage.setItem).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    expect(loadAutosave(storage)).toEqual(store.getState().document)
  })

  it('does not save when only the selection changes', () => {
    const { store, storage, rootId } = setup()
    const id = store.getState().addNode(rootId, 'Frame')
    vi.advanceTimersByTime(500)
    storage.setItem.mockClear()

    store.getState().select(id)
    vi.advanceTimersByTime(500)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('saves a waiting edit when stopped', () => {
    const { store, storage, stop, rootId } = setup()
    store.getState().addNode(rootId, 'Frame')
    stop()
    expect(storage.setItem).toHaveBeenCalledTimes(1)

    store.getState().addNode(rootId, 'Frame') // no longer watched
    vi.advanceTimersByTime(500)
    expect(storage.setItem).toHaveBeenCalledTimes(1)
  })

  it('keeps going when the storage is full', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { store, storage, rootId } = setup()
    storage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    store.getState().addNode(rootId, 'Frame')
    expect(() => vi.advanceTimersByTime(500)).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })
})
