import { describe, expect, it } from 'vitest'
import { DEVICES } from '../model/screen.ts'
import { DEFAULT_PANEL_LAYOUT, PANEL_MIN_WIDTH } from './panelLayout.ts'
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

  it('snaps by default, and can be switched off', () => {
    const { store } = setup()
    expect(store.getState().snapping).toBe(true)
    store.getState().setSnapping(false)
    expect(store.getState().snapping).toBe(false)
  })

  it('remembers which text is being edited on the canvas', () => {
    const { store } = setup()
    expect(store.getState().editingTextId).toBeNull()
    store.getState().setEditingTextId('abc')
    expect(store.getState().editingTextId).toBe('abc')
  })

  it('zoomTo sets an exact zoom', () => {
    const { store, view } = setup()
    store.getState().zoomTo(1)
    expect(view().zoom).toBe(1)
  })

  it('resizes, docks, flips and resets the side panels', () => {
    const { store } = setup()
    const state = () => store.getState()
    state().setSideWidth('left', 320)
    expect(state().panels.widths.left).toBe(320)
    state().setSideWidth('right', 5) // too narrow: held at the limit
    expect(state().panels.widths.right).toBe(PANEL_MIN_WIDTH)

    // Dock the Explorer under Properties: the left side empties.
    state().dockPanel('explorer', { side: 'right', index: 1 })
    expect(state().panels.left).toEqual([])
    expect(state().panels.right).toEqual(['properties', 'explorer'])
    state().setPanelSplit(0.7)
    expect(state().panels.split).toBe(0.7)

    state().swapPanels() // the whole stack moves to the left
    expect(state().panels.left).toEqual(['properties', 'explorer'])
    expect(state().panels.right).toEqual([])

    state().resetPanels()
    expect(state().panels).toEqual(DEFAULT_PANEL_LAYOUT)
  })

  it('asks Properties to show a modifier, unfolding its section', () => {
    const { store } = setup()
    const state = () => store.getState()
    state().toggleSection('Modifiers') // folded shut
    state().toggleSection('Text')
    state().revealModifier('frame', 'UICorner')
    expect(state().modifierReveal).toEqual({
      id: 'frame',
      modifier: 'UICorner',
    })
    expect(state().closedSections).toEqual(['Text'])
    // Asking again for the same one is still a new request.
    const first = state().modifierReveal
    state().revealModifier('frame', 'UICorner')
    expect(state().modifierReveal).not.toBe(first)
  })
})
