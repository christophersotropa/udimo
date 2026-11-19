import { describe, expect, it } from 'vitest'
import {
  createDocumentStore,
  type ElementClassName,
} from '../store/documentStore.ts'
import type { Props } from './types.ts'
import { exportWarnings, type MeasureText } from './warnings.ts'

// A document with one element in it, positioned well inside every screen
// and away from the top bar, unless `props` says otherwise.
function setup(className: ElementClassName = 'Frame', props: Props = {}) {
  const store = createDocumentStore()
  const root = store.getState().document.rootId
  const id = store.getState().addNode(root, className, {
    Position: { xs: 0, xo: 100, ys: 0, yo: 100 },
    ...props,
  })
  return {
    store,
    root,
    id,
    warnings: () => exportWarnings(store.getState().document),
  }
}

const messages = (list: { message: string }[]) => list.map((w) => w.message)

describe('exportWarnings', () => {
  it('notes an empty ScreenGui', () => {
    const store = createDocumentStore()
    expect(messages(exportWarnings(store.getState().document))).toEqual([
      'The ScreenGui is empty: there is nothing to export yet.',
    ])
  })

  it('has nothing to say about a plain, well-placed Frame', () => {
    expect(setup().warnings()).toEqual([])
  })

  describe('images', () => {
    it("warns about Studio's placeholder, no image, or a bad ID", () => {
      expect(messages(setup('ImageLabel').warnings())[0]).toContain(
        'placeholder',
      )
      expect(
        messages(setup('ImageLabel', { Image: '' }).warnings())[0],
      ).toContain('has no image')
      expect(
        messages(
          setup('ImageLabel', { Image: 'my-picture.png' }).warnings(),
        )[0],
      ).toContain("doesn't look like a Roblox ID")
    })

    it('is happy with an asset ID or a Roblox link', () => {
      expect(setup('ImageLabel', { Image: '123456' }).warnings()).toEqual([])
      expect(
        setup('ImageLabel', {
          Image: 'https://create.roblox.com/store/asset/99/Icon',
        }).warnings(),
      ).toEqual([])
    })
  })

  describe('text that does not fit', () => {
    // Pretend every character is exactly 10px wide, whatever the size.
    const tenPerChar: MeasureText = (text) => text.length * 10

    it('names the devices where it overflows', () => {
      // 10% of the screen wide: 192px on PC, 102px on tablet, 84px on phone.
      const { store } = setup('TextLabel', {
        Size: { xs: 0.1, xo: 0, ys: 0, yo: 50 },
        Text: 'fifteen letters', // 150px
      })
      const [warning] = exportWarnings(store.getState().document, tenPerChar)
      expect(warning.message).toContain('may not fit on Tablet and Phone')
      expect(warning.level).toBe('warning')
      expect(warning.devices).toEqual(['tablet', 'phone']) // to preview there
    })

    it('counts lines against the height', () => {
      const { store } = setup('TextLabel', {
        Size: { xs: 0, xo: 400, ys: 0, yo: 30 },
        Text: 'one\ntwo', // two lines of TextSize 20 = 40px tall
        TextSize: 20,
      })
      expect(
        exportWarnings(store.getState().document, tenPerChar),
      ).toHaveLength(1)
    })

    it('trusts TextScaled to fit', () => {
      const { store } = setup('TextLabel', {
        Size: { xs: 0, xo: 20, ys: 0, yo: 20 },
        Text: 'far too long for this box',
        TextScaled: true,
      })
      expect(exportWarnings(store.getState().document, tenPerChar)).toEqual([])
    })
  })

  describe('elements off the screen', () => {
    it('names the devices where an element goes past the edge', () => {
      // 1000 to 1200px from the left: fine on PC (1920), not on smaller screens.
      const { warnings } = setup('Frame', {
        Position: { xs: 0, xo: 1000, ys: 0, yo: 100 },
        Size: { xs: 0, xo: 200, ys: 0, yo: 100 },
      })
      expect(messages(warnings())).toEqual([
        '"Frame" goes past the edge of the screen on Tablet and Phone. Try "Make responsive", or move it in.',
      ])
    })

    it('only reports the outermost element, and not ScrollingFrame contents', () => {
      const { store, id } = setup('Frame', {
        Position: { xs: 0, xo: 1000, ys: 0, yo: 100 },
        Size: { xs: 0, xo: 200, ys: 0, yo: 100 },
      })
      store.getState().addNode(id, 'Frame') // moves with its parent
      const scroller = store
        .getState()
        .addNode(store.getState().document.rootId, 'ScrollingFrame', {
          Position: { xs: 0, xo: 100, ys: 0, yo: 100 },
        })
      store.getState().renameNode(scroller, 'List')
      store.getState().addNode(scroller, 'Frame', {
        Position: { xs: 0, xo: 0, ys: 0, yo: 5000 }, // far down, but it scrolls
      })
      const offScreen = exportWarnings(store.getState().document).filter((w) =>
        w.key.startsWith('offscreen:'),
      )
      expect(offScreen.map((w) => w.nodeId)).toEqual([id])
    })
  })

  describe("Roblox's top bar", () => {
    it('notes top-level elements in the top strip', () => {
      const [note] = setup('Frame', {
        Position: { xs: 0, xo: 24, ys: 0, yo: 24 },
      }).warnings()
      expect(note.level).toBe('info')
      expect(note.message).toContain('"Frame" sits in the top 58 px')
    })

    it('ignores hidden elements', () => {
      const { warnings } = setup('Frame', {
        Position: { xs: 0, xo: 24, ys: 0, yo: 24 },
        Visible: false,
      })
      expect(warnings()).toEqual([])
    })
  })

  it('merges identical warnings into one, with a count', () => {
    const { store, root } = setup('ImageLabel')
    store.getState().addNode(root, 'ImageLabel', {
      Position: { xs: 0, xo: 300, ys: 0, yo: 100 },
    })
    const placeholder = exportWarnings(store.getState().document).filter((w) =>
      w.key.startsWith('image:'),
    )
    expect(placeholder).toHaveLength(1)
    expect(placeholder[0].message).toMatch(/\(2 elements\)$/)
  })

  describe('duplicate names', () => {
    it('notes siblings that share a name', () => {
      const { store, root } = setup('Frame')
      store.getState().addNode(root, 'Frame', {
        Position: { xs: 0, xo: 300, ys: 0, yo: 100 },
      })
      expect(messages(exportWarnings(store.getState().document))).toEqual([
        '2 elements in "ScreenGui" are called "Frame". Scripts find elements by name, so give each a different one.',
      ])
    })
  })
})
