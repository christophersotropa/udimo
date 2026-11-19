import { describe, expect, it } from 'vitest'
import { DEVICES } from '../model/screen.ts'
import { createViewStore, currentView, screenOf } from './viewStore.ts'

function setup() {
  const store = createViewStore()
  store.getState().setArea({ width: 1000, height: 600 })
  const view = () => currentView(store.getState())
  return { store, view }
}

describe('view store', () => {
  it('starts on the PC screen, fitted to the area', () => {
    const { store, view } = setup()
    expect(screenOf(store.getState())).toEqual(DEVICES.pc)
    expect(store.getState().custom).toBeNull()
    expect(view().zoom).toBeCloseTo((1000 - 64) / 1920)
  })

  it('zooms around the center of the area by default', () => {
    const { store, view } = setup()
    const before = view()
    // The game pixel at the area's center...
    const centerX = (500 - before.x) / before.zoom
    store.getState().zoomBy(2)
    const after = view()
    expect(after.zoom).toBeCloseTo(before.zoom * 2)
    // ...is still at the center.
    expect(after.x + centerX * after.zoom).toBeCloseTo(500)
  })

  it('pans from wherever the view is', () => {
    const { store, view } = setup()
    const before = view()
    store.getState().panBy(30, -10)
    expect(view()).toEqual({ ...before, x: before.x + 30, y: before.y - 10 })
  })

  it('goes back to fitted on Fit, or when the device changes', () => {
    const { store } = setup()
    store.getState().zoomBy(2)
    store.getState().fit()
    expect(store.getState().custom).toBeNull()

    store.getState().zoomBy(2)
    store.getState().setDevice('phone')
    expect(store.getState().custom).toBeNull()
    expect(screenOf(store.getState())).toEqual(DEVICES.phone)
  })

  it('starts with the select tool, and switches tools', () => {
    const { store } = setup()
    expect(store.getState().tool).toBe('select')
    store.getState().setTool('hand')
    expect(store.getState().tool).toBe('hand')
  })

  it('zoomTo sets an exact zoom', () => {
    const { store, view } = setup()
    store.getState().zoomTo(1)
    expect(view().zoom).toBe(1)
  })
})
